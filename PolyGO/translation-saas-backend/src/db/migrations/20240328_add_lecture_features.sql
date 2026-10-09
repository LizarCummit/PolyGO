-- Lectures table
CREATE TABLE lectures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    audio_url TEXT,
    transcript_text TEXT,
    duration INTEGER, -- in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lecture segments for timestamped sections
CREATE TABLE lecture_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID REFERENCES lectures(id),
    start_time INTEGER, -- in seconds
    end_time INTEGER, -- in seconds
    speaker_label VARCHAR(50),
    text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI-generated summaries and analysis
CREATE TABLE lecture_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID REFERENCES lectures(id),
    summary TEXT,
    key_points JSONB,
    themes JSONB,
    important_terms JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study materials
CREATE TABLE study_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID REFERENCES lectures(id),
    material_type VARCHAR(50), -- 'question', 'note', 'summary', etc.
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    lecture_id UUID REFERENCES lectures(id),
    last_position INTEGER, -- in seconds
    completion_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research and citations
CREATE TABLE research_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lecture_id UUID REFERENCES lectures(id),
    source_type VARCHAR(50), -- 'academic_paper', 'book', 'website', etc.
    title VARCHAR(255),
    authors JSONB,
    url TEXT,
    citation_text TEXT,
    relevance_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX idx_lectures_user_id ON lectures(user_id);
CREATE INDEX idx_lecture_segments_lecture_id ON lecture_segments(lecture_id);
CREATE INDEX idx_lecture_analysis_lecture_id ON lecture_analysis(lecture_id);
CREATE INDEX idx_study_materials_lecture_id ON study_materials(lecture_id);
CREATE INDEX idx_user_progress_user_lecture ON user_progress(user_id, lecture_id);
CREATE INDEX idx_research_materials_lecture_id ON research_materials(lecture_id);

-- Add RLS policies
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_materials ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own lectures"
    ON lectures FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own progress"
    ON user_progress FOR ALL
    USING (auth.uid() = user_id); 