-- CMS Pages, Hero Banners, and Blocks (with scheduling)
BEGIN;

CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  meta_title text,
  meta_description text,
  content_html text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_hero_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  cta_text text,
  cta_href text,
  background_url text,
  is_active boolean DEFAULT false,
  start_at timestamptz,
  end_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_key text UNIQUE NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  start_at timestamptz,
  end_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

COMMIT;