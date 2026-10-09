-- Create lectures table
CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    transcription TEXT,
    key_points JSONB,
    summary TEXT,
    status VARCHAR(20) NOT NULL,
    audio_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_lectures_updated_at
    BEFORE UPDATE ON lectures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for lecture recordings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lecture-recordings', 'lecture-recordings', false);

-- Set up storage policies
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'lecture-recordings');

CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'lecture-recordings' 
    AND auth.role() = 'authenticated'
); 