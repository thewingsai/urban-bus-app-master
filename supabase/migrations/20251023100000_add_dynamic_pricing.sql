-- Dynamic pricing that changes deterministically every 5 hours (UTC)
-- Range: 899 .. 2500
-- Adds:
--   - current_5h_bucket() helper
--   - dynamic_price(schedule_id, base_price, min_price, max_price)
--   - view bus_schedules_priced with current_price column

BEGIN;

-- Helper: current 5-hour bucket index in UTC
CREATE OR REPLACE FUNCTION public.current_5h_bucket()
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT floor(extract(epoch from date_trunc('hour', now() at time zone 'UTC')) / (5*3600))::bigint;
$$;

-- Core: deterministic pseudo-random price per schedule within a 5-hour bucket
CREATE OR REPLACE FUNCTION public.dynamic_price(
  p_schedule_id uuid,
  p_base_price numeric,
  p_min_price numeric DEFAULT 899,
  p_max_price numeric DEFAULT 2500
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_bucket bigint := public.current_5h_bucket();
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

  -- Keep price "similar": allow ±20% around base_price but clamp to global range
  v_local_min := greatest(p_min_price, round(p_base_price * 0.80, 0));
  v_local_max := least(p_max_price, round(p_base_price * 1.20, 0));

  IF v_local_max < v_local_min THEN
    -- Fallback if base_price is outside bounds or zero
    v_local_min := p_min_price;
    v_local_max := p_max_price;
  END IF;

  IF v_local_max = v_local_min THEN
    v_price := v_local_min;
  ELSE
    v_price := v_local_min + v_rnd * (v_local_max - v_local_min);
  END IF;

  -- Round to nearest whole currency unit
  v_price := round(v_price, 0);

  -- Final clamp to absolute bounds
  v_price := least(p_max_price, greatest(p_min_price, v_price));

  RETURN v_price;
END;
$$;

-- View exposing current_price alongside schedules
CREATE OR REPLACE VIEW public.bus_schedules_priced AS
SELECT
  s.*,
  public.dynamic_price(s.id, s.base_price, 899, 2500) AS current_price
FROM public.bus_schedules s;

COMMENT ON VIEW public.bus_schedules_priced IS 'Bus schedules with dynamic current_price that changes every 5 hours (UTC) within 899..2500, ±20% around base_price where possible.';

COMMIT;
