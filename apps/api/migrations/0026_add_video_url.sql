-- Add video_url column for embedded video support (YouTube, etc.)
ALTER TABLE recipes ADD COLUMN video_url TEXT;
