-- Admin-controllable route pricing and booking price capture
-- Creates route_admin_pricing table, alters bookings to store applied_price and pricing_mode,
-- and adds views exposing effective (admin-overridden) current_price.

BEGIN;

-- Table: route_admin_pricing
CREATE TABLE IF NOT EXISTS public.route_admin_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid UNIQUE REFERENCES public.routes(id) ON DELETE CASCADE,
  allowed_fares numeric[] NOT NULL,
  active_fare numeric,
  is_enabled boolean DEFAULT true,
  updated_by text,
  updated_at timestamptz DEFAULT now()
);

-- Columns on bookings to capture which price was applied at time of booking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS applied_price numeric,
  ADD COLUMN IF NOT EXISTS pricing_mode text DEFAULT 'dynamic';

-- Effective priced view (5h baseline dynamic) honoring admin override
CREATE OR REPLACE VIEW public.search_schedules_effective_priced AS
SELECT
  s.id,
  s.bus_id,
  s.route_id,
  r.origin,
  r.destination,
  s.departure_time,
  s.arrival_time,
  s.base_price,
  s.available_days,
  s.is_active,
  s.created_at,
  CASE WHEN rap.is_enabled AND rap.active_fare IS NOT NULL
       THEN rap.active_fare
       ELSE public.dynamic_price(s.id, s.base_price, 899, 2500)
  END AS current_price,
  CASE WHEN rap.is_enabled AND rap.active_fare IS NOT NULL THEN 'admin'::text ELSE 'dynamic'::text END AS pricing_mode
FROM public.bus_schedules s
JOIN public.routes r ON r.id = s.route_id
LEFT JOIN public.route_admin_pricing rap ON rap.route_id = r.id;

COMMENT ON VIEW public.search_schedules_effective_priced IS 'Schedules with effective current_price (admin override if enabled, else dynamic) and pricing_mode.';

-- Effective priced view using 2-hour buckets
CREATE OR REPLACE VIEW public.search_schedules_effective_priced_2h AS
SELECT
  s.id,
  s.bus_id,
  s.route_id,
  r.origin,
  r.destination,
  s.departure_time,
  s.arrival_time,
  s.base_price,
  s.available_days,
  s.is_active,
  s.created_at,
  CASE WHEN rap.is_enabled AND rap.active_fare IS NOT NULL
       THEN rap.active_fare
       ELSE public.dynamic_price_bucket(s.id, s.base_price, 899, 2500, 2)
  END AS current_price,
  CASE WHEN rap.is_enabled AND rap.active_fare IS NOT NULL THEN 'admin'::text ELSE 'dynamic'::text END AS pricing_mode
FROM public.bus_schedules s
JOIN public.routes r ON r.id = s.route_id
LEFT JOIN public.route_admin_pricing rap ON rap.route_id = r.id;

COMMENT ON VIEW public.search_schedules_effective_priced_2h IS 'Schedules with effective current_price (admin override if enabled, else dynamic 2h) and pricing_mode.';

-- Seed Kalpa -> Delhi admin pricing with allowed fare tiers
DO $$
DECLARE
  v_route_id uuid;
BEGIN
  SELECT id INTO v_route_id FROM public.routes WHERE origin = 'Kalpa' AND destination = 'Delhi' LIMIT 1;
  IF v_route_id IS NULL THEN
    -- Create a minimal route placeholder if not present
    INSERT INTO public.routes(origin, destination, distance_km, duration_hours, stops)
    VALUES ('Kalpa', 'Delhi', 570, 16, '[]'::jsonb)
    RETURNING id INTO v_route_id;
  END IF;

  -- Upsert admin pricing for this route
  INSERT INTO public.route_admin_pricing(route_id, allowed_fares, active_fare, is_enabled, updated_by)
  VALUES (v_route_id, ARRAY[999,1199,1399,1499,1799,1999,2100,2450]::numeric[], 1499, true, 'migration')
  ON CONFLICT (route_id) DO UPDATE SET
    allowed_fares = EXCLUDED.allowed_fares,
    active_fare = EXCLUDED.active_fare,
    is_enabled = EXCLUDED.is_enabled,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();
END $$;

COMMIT;