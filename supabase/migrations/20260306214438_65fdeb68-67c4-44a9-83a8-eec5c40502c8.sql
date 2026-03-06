
-- Phone locks table for preventing duplicate AI responses
CREATE TABLE IF NOT EXISTS public.phone_locks (
  phone TEXT PRIMARY KEY,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 seconds')
);

-- Acquire phone lock (returns true if acquired)
CREATE OR REPLACE FUNCTION public.acquire_phone_lock(p_phone TEXT, p_lock_duration_seconds INT DEFAULT 30)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_acquired BOOLEAN;
BEGIN
  -- Delete expired locks first
  DELETE FROM phone_locks WHERE expires_at < now();
  
  -- Try to insert lock (ON CONFLICT DO NOTHING = already locked)
  BEGIN
    INSERT INTO phone_locks (phone, locked_at, expires_at)
    VALUES (p_phone, now(), now() + make_interval(secs => p_lock_duration_seconds));
    v_acquired := true;
  EXCEPTION WHEN unique_violation THEN
    v_acquired := false;
  END;
  
  RETURN v_acquired;
END;
$$;

-- Release phone lock
CREATE OR REPLACE FUNCTION public.release_phone_lock(p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM phone_locks WHERE phone = p_phone;
END;
$$;
