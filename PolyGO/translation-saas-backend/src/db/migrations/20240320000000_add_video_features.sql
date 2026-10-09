-- Create video_categories table
CREATE TABLE IF NOT EXISTS video_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create video_tags table
CREATE TABLE IF NOT EXISTS video_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create video_tag_relations table
CREATE TABLE IF NOT EXISTS video_tag_relations (
  video_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES video_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- Create video_analytics table
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  watch_time INTEGER NOT NULL DEFAULT 0,
  last_position INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (video_id, user_id)
);

-- Create video_shares table
CREATE TABLE IF NOT EXISTS video_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES media_content(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_views INTEGER,
  current_views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add category_id to media_content table
ALTER TABLE media_content
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES video_categories(id) ON DELETE SET NULL;

-- Add thumbnail_url to media_content table
ALTER TABLE media_content
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add duration to media_content table
ALTER TABLE media_content
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Add format to media_content table
ALTER TABLE media_content
ADD COLUMN IF NOT EXISTS format VARCHAR(10);

-- Add quality to media_content table
ALTER TABLE media_content
ADD COLUMN IF NOT EXISTS quality VARCHAR(10);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_video_categories_updated_at
  BEFORE UPDATE ON video_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_analytics_updated_at
  BEFORE UPDATE ON video_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_shares_updated_at
  BEFORE UPDATE ON video_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 