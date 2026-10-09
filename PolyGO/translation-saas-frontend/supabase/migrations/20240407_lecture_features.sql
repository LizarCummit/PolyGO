-- Create lectures table with Zoom integration
CREATE TABLE IF NOT EXISTS lectures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER, -- in seconds
  zoom_meeting_id TEXT,
  zoom_recording_url TEXT,
  status TEXT DEFAULT 'processing',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create media content table
CREATE TABLE IF NOT EXISTS media_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'audio', 'video', 'screenshot'
  url TEXT NOT NULL,
  timestamp INTEGER, -- in seconds from start
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transcript segments table
CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  start_time INTEGER, -- in seconds from start
  end_time INTEGER, -- in seconds from start
  speaker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create summaries table
CREATE TABLE IF NOT EXISTS summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
  key_points JSONB,
  full_summary TEXT,
  questions_answers JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  zoom_access_token TEXT,
  zoom_refresh_token TEXT,
  zoom_token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own lectures" 
  ON lectures FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lectures" 
  ON lectures FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lectures" 
  ON lectures FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lectures" 
  ON lectures FOR DELETE 
  USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view their own media content" 
  ON media_content FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM lectures 
    WHERE lectures.id = media_content.lecture_id 
    AND lectures.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own media content" 
  ON media_content FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM lectures 
    WHERE lectures.id = media_content.lecture_id 
    AND lectures.user_id = auth.uid()
  ));

-- Add similar policies for transcript_segments and summaries 