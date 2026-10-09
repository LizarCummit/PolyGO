-- Create users table with subscription info
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free',
    usage_limits JSONB NOT NULL DEFAULT '{"transcription_minutes": 60, "translations_per_month": 100, "storage_gb": 1}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage statistics table
CREATE TABLE usage_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    transcription_minutes_used INTEGER DEFAULT 0,
    translations_used INTEGER DEFAULT 0,
    storage_used FLOAT DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity log table
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_type VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing history table
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) NOT NULL,
    subscription_tier VARCHAR(20) NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API keys table
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- Create function to update usage statistics
CREATE OR REPLACE FUNCTION update_usage_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update usage statistics based on action type
    IF NEW.action_type = 'transcription' THEN
        UPDATE usage_statistics
        SET transcription_minutes_used = transcription_minutes_used + NEW.count
        WHERE user_id = NEW.user_id;
    ELSIF NEW.action_type = 'translation' THEN
        UPDATE usage_statistics
        SET translations_used = translations_used + NEW.count
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating usage statistics
CREATE TRIGGER update_usage_on_activity
    AFTER INSERT ON activity_log
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_statistics();

-- Create function to reset monthly usage
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
    UPDATE usage_statistics
    SET 
        transcription_minutes_used = 0,
        translations_used = 0,
        last_reset = NOW()
    WHERE DATE_TRUNC('month', last_reset) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better query performance
CREATE INDEX idx_activity_log_user_date ON activity_log(user_id, date);
CREATE INDEX idx_usage_stats_user ON usage_statistics(user_id);
CREATE INDEX idx_billing_history_user ON billing_history(user_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);

-- Set up RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data"
    ON users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can view own usage"
    ON usage_statistics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity"
    ON activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view own billing"
    ON billing_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own API keys"
    ON api_keys FOR ALL
    USING (auth.uid() = user_id); 