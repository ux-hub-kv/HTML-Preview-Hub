# Supabase Setup Guide

To use this app, you need a Supabase project.

## 1. Create the Table
Run this SQL in your Supabase SQL Editor:

```sql
CREATE TABLE html_previews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE html_previews ENABLE ROW LEVEL SECURITY;

-- Create Policies (Adjust as needed)
CREATE POLICY "Public Read Access" ON html_previews FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON html_previews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON html_previews FOR UPDATE USING (true);
```

## 2. Create the Storage Bucket
1. Go to **Storage** in Supabase Dashboard.
2. Create a new bucket named `previews`.
3. Make it **Public** (or configure bucket policies to allow public read).
4. policy for `previews` bucket:
   - Allow Selective Read: `true`
   - Allow Insert: `true`
   - Allow Update: `true`

## 3. Environment Variables
Add these to your Secrets in AI Studio:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
