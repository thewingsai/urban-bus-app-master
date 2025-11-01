-- Enforce coupon discount cap of 100 across offers
BEGIN;

-- Ensure max_discount defaults to 100 going forward
ALTER TABLE public.offers
  ALTER COLUMN max_discount SET DEFAULT 100;

-- Clamp existing rows to 100
UPDATE public.offers
SET max_discount = LEAST(COALESCE(max_discount, 100), 100);

-- Add a CHECK constraint to prevent values above 100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'offers_max_discount_le_100'
  ) THEN
    ALTER TABLE public.offers
      ADD CONSTRAINT offers_max_discount_le_100 CHECK (max_discount <= 100);
  END IF;
END $$;

COMMIT;