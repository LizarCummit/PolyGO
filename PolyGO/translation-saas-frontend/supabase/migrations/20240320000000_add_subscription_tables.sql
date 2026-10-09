-- Add subscription-related columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id text;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    stripe_invoice_id text,
    stripe_customer_id text,
    stripe_subscription_id text,
    amount bigint,
    status text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create usage table for tracking transcription usage
CREATE TABLE IF NOT EXISTS usage (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES users(id),
    transcription_count integer DEFAULT 0,
    total_duration integer DEFAULT 0, -- in seconds
    month date,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, month)
);

-- Add RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
    ON payments FOR SELECT
    USING (auth.uid() = user_id);

-- Usage policies
CREATE POLICY "Users can view their own usage"
    ON usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can update usage"
    ON usage FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to initialize usage record
CREATE OR REPLACE FUNCTION public.initialize_monthly_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO usage (user_id, month)
    VALUES (NEW.id, date_trunc('month', CURRENT_DATE))
    ON CONFLICT (user_id, month) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Create trigger to initialize usage when new user is created
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION initialize_monthly_usage();

-- Create function to reset usage on the first of each month
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO usage (user_id, month)
    SELECT id, date_trunc('month', CURRENT_DATE)
    FROM users
    ON CONFLICT (user_id, month) DO NOTHING;
END;
$$; 