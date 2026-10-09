# PolyGO roadmap

A planning checklist from the original feature brief. Items marked done exist in the code today; everything else is planned.

## Core lecture processing

- [x] Audio transcription (Google Cloud Speech-to-Text)
- [x] Basic transcript storage (Supabase)
- [ ] Audio format validation and preprocessing
- [ ] Noise reduction and audio enhancement
- [ ] Speaker diarization
- [ ] Timestamp markers for navigation
- [ ] Search within transcripts

## AI analysis and summaries

- [x] Summary generation (partially implemented)
- [x] Key point extraction and relationship mapping (first version)
- [ ] Structured summaries: topics, key point hierarchy, definitions, concept timeline
- [ ] Knowledge graph generation
- [ ] Self-test question generation

## Research assistant (premium)

- [ ] Automated research from reliable sources
- [ ] Citation management
- [ ] Related paper recommendations
- [ ] Subject-specific terminology explanations
- [ ] Concept maps, practice questions and study guides

## Users and progress

- [x] Authentication (Supabase)
- [ ] Profiles with academic interests
- [ ] Progress tracking, learning history and analytics
- [ ] Bookmarks, notes and study sessions

## Organisation and sharing

- [ ] Courses, folders and tags
- [ ] Sharing and collaboration
- [ ] Export (PDF, DOCX) and import

## Subscriptions

- [x] Basic Stripe integration
- [ ] Refine subscription tiers

## Suggested order

1. **MVP**: audio upload and validation, transcription with timestamps, simple summaries, basic notes.
2. **Enhanced analysis**: key points, themes, important terms, study guides.
3. **Research assistant (premium)**: academic sources, citations, terminology help.
4. **Continuous**: progress tracking, organisation, search and export.
