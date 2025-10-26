-- Extend dynamic pricing to support configurable hour buckets (2h and 5h)
-- Range: 899..2500
-- Adds:
--  - current_bucket(p_hours)
--  - dynamic_price_bucket(..., p_hours default 5)
--  - view bus_schedules_priced_2h using 2-hour buckets

BEGIN;

-- Generic helper: current N-hour bucket (UTC)
CREATE OR REPLACE FUNCTION public.current_bucket(p_hours integer DEFAULT 5)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT floor(extract(epoch from date_trunc('hour', now() at time zone 'UTC')) / (greatest(1, p_hours) * 3600))::bigint;
$$;

-- Generalized dynamic price function parametrized by bucket hours
CREATE OR REPLACE FUNCTION public.dynamic_price_bucket(
  p_schedule_id uuid,
  p_base_price numeric,
  p_min_price numeric DEFAULT 899,
  p_max_price numeric DEFAULT 2500,
  p_hours integer DEFAULT 5
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_bucket bigint := public.current_bucket(p_hours);
  v_hash bytea;
  v_val bigint;
  v_rnd numeric; -- 0..1
  v_local_min numeric;
  v_local_max numeric;
  v_price numeric;
BEGIN
  -- Derive a deterministic 32-bit value from md5(schedule_id || bucket)
  v_hash := decode(md5(p_schedule_id::text || '-' || v_bucket::text), 'hex');
  v_val := (get_byte(v_hash, 0)::bigint << 24)
         + (get_byte(v_hash, 1)::bigint << 16)
         + (get_byte(v_hash, 2)::bigint << 8)
         +  get_byte(v_hash, 3)::bigint;
  v_rnd := v_val / 4294967295.0;  -- normalize to 0..1

  -- Keep price similar: ±20% around base_price, clamped to global range
  v_local_min := greatest(p_min_price, round(p_base_price * 0.80, 0));
  v_local_max := least(p_max_price, round(p_base_price * 1.20, 0));

  IF v_local_max < v_local_min THEN
    v_local_min := p_min_price;
    v_local_max := p_max_price;
  END IF;

  IF v_local_max = v_local_min THEN
    v_price := v_local_min;
  ELSE
    v_price := v_local_min + v_rnd * (v_local_max - v_local_min);
  END IF;

  v_price := round(v_price, 0);
  v_price := least(p_max_price, greatest(p_min_price, v_price));

  RETURN v_price;
END;
$$;

-- 2-hour priced view
CREATE OR REPLACE VIEW public.bus_schedules_priced_2h AS
SELECT
  s.*,
  public.dynamic_price_bucket(s.id, s.base_price, 899, 2500, 2) AS current_price
FROM public.bus_schedules s;

COMMENT ON VIEW public.bus_schedules_priced_2h IS 'Bus schedules with dynamic current_price that changes every 2 hours (UTC) within 899..2500, ±20% around base_price where possible.';

-- Search-friendly views that include origin/destination for filtering
CREATE OR REPLACE VIEW public.search_schedules_priced AS
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
  public.dynamic_price(s.id, s.base_price, 899, 2500) AS current_price
FROM public.bus_schedules s
JOIN public.routes r ON r.id = s.route_id;

CREATE OR REPLACE VIEW public.search_schedules_priced_2h AS
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
  public.dynamic_price_bucket(s.id, s.base_price, 899, 2500, 2) AS current_price
FROM public.bus_schedules s
JOIN public.routes r ON r.id = s.route_id;

COMMENT ON VIEW public.search_schedules_priced IS 'Schedules joined with routes and dynamic current_price (5h buckets) for easy filtering by origin/destination.';
COMMENT ON VIEW public.search_schedules_priced_2h IS 'Schedules joined with routes and dynamic current_price (2h buckets) for easy filtering by origin/destination.';

COMMIT;
