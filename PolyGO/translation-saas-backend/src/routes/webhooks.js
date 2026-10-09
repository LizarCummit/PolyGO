const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe webhook secret from your Stripe dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Raw body parsing for Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object;
      const userId = subscription.metadata.userId;
      const planName = subscription.metadata.planName;

      // Update user's subscription status in Supabase
      await supabase
        .from('users')
        .update({
          subscription_status: subscription.status,
          subscription_plan: planName,
          subscription_id: subscription.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      break;

    case 'customer.subscription.deleted':
      const deletedSubscription = event.data.object;
      const deletedUserId = deletedSubscription.metadata.userId;

      // Reset user's subscription status
      await supabase
        .from('users')
        .update({
          subscription_status: 'inactive',
          subscription_plan: 'free',
          subscription_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', deletedUserId);
      break;

    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      if (invoice.billing_reason === 'subscription_create') {
        // Record the successful payment
        await supabase
          .from('payments')
          .insert({
            user_id: invoice.metadata.userId,
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer,
            stripe_subscription_id: invoice.subscription,
            amount: invoice.amount_paid,
            status: 'succeeded',
            created_at: new Date().toISOString()
          });
      }
      break;

    case 'invoice.payment_failed':
      const failedInvoice = event.data.object;
      // Handle failed payment (e.g., notify user)
      console.error('Payment failed for invoice:', failedInvoice.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router; 