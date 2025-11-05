-- Site-wide CMS settings table
BEGIN;
CREATE TABLE IF NOT EXISTS public.site_settings (
  id text PRIMARY KEY,
  seo_title text,
  seo_description text,
  og_image text,
  twitter_image text,
  phone text,
  email text,
  support_whatsapp text,
  footer_html text,
  updated_at timestamptz DEFAULT now()
);
-- Seed default row
INSERT INTO public.site_settings(id, seo_title, seo_description)
VALUES ('global','UrbanBus - Intercity Bus Booking','Book safe, comfortable intercity buses across Himachal, Delhi, Chandigarh')
ON CONFLICT (id) DO UPDATE SET updated_at = now();
COMMIT;