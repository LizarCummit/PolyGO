import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed.`, err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        const planName = subscription.metadata.planName;

        // Update user's subscription status
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
        const deletedSubscription = event.data.object as Stripe.Subscription;
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
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason === 'subscription_create') {
          // Record the successful payment in your database
          const subscriptionId = invoice.subscription;
          const customerId = invoice.customer;
          
          await supabase
            .from('payments')
            .insert({
              stripe_invoice_id: invoice.id,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              amount: invoice.amount_paid,
              status: 'succeeded',
              created_at: new Date().toISOString()
            });
        }
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        // Handle failed payment (e.g., notify user)
        console.error('Payment failed for invoice:', failedInvoice.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }
} 