-- Enable RLS and allow public read for CMS tables
BEGIN;
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_blocks ENABLE ROW LEVEL SECURITY;

-- Public (anon, authenticated) can read published/active content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_settings' AND policyname='Anyone can view site settings'
  ) THEN
    CREATE POLICY "Anyone can view site settings"
      ON public.site_settings FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_pages' AND policyname='Anyone can view published pages'
  ) THEN
    CREATE POLICY "Anyone can view published pages"
      ON public.site_pages FOR SELECT
      TO anon, authenticated
      USING (is_published = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_hero_banners' AND policyname='Anyone can view active hero banners'
  ) THEN
    CREATE POLICY "Anyone can view active hero banners"
      ON public.site_hero_banners FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_blocks' AND policyname='Anyone can view active blocks'
  ) THEN
    CREATE POLICY "Anyone can view active blocks"
      ON public.site_blocks FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;
COMMIT;