-- Ficheiro: supabase_setup_v2.sql | Função: setup completo do Supabase para RideFriend v2.1
-- Conforme RideFriend_Prompts_v2.1 (P0 + P2). Single-file setup — drop+recreate em pre-launch.
-- Para correr: cole no SQL Editor do Supabase e execute.

------------------------------------------------------------
-- 0. CLEANUP (idempotente em pre-launch)
------------------------------------------------------------
DROP FUNCTION IF EXISTS public.nearby_drivers(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.nearby_passengers(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT) CASCADE;
DROP FUNCTION IF EXISTS public.nearby_passengers_at_stop(UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS public.nearest_stop(NUMERIC, NUMERIC, VARCHAR, INT) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_rating_avg() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TABLE IF EXISTS public.sos_events CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.rides CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.bus_stops CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.contact_group CASCADE;
DROP TYPE IF EXISTS public.location_mode CASCADE;
DROP TYPE IF EXISTS public.ride_status CASCADE;

------------------------------------------------------------
-- 1. EXTENSÕES
------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

------------------------------------------------------------
-- 2. ENUMS (conforme P2 v1 + igual v2.1)
------------------------------------------------------------
CREATE TYPE public.contact_group AS ENUM ('family', 'friend', 'colleague', 'neighbour');
CREATE TYPE public.location_mode AS ENUM ('passenger', 'driver');
CREATE TYPE public.ride_status   AS ENUM ('requested', 'accepted', 'in_progress', 'completed', 'cancelled');

------------------------------------------------------------
-- 3. TABELAS
------------------------------------------------------------

-- users — perfil + market_code (v2.1)
CREATE TABLE public.users (
  id              UUID PRIMARY KEY,                         -- igual ao auth.uid()
  phone           VARCHAR(32) UNIQUE NOT NULL,              -- E.164
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(255),
  photo_url       TEXT,
  home_area       VARCHAR(120),                             -- bairro/zona
  is_driver       BOOLEAN NOT NULL DEFAULT false,
  rating_avg      NUMERIC(3,2) NOT NULL DEFAULT 0,
  ride_count      INTEGER NOT NULL DEFAULT 0,
  expo_push_token TEXT,
  market_code     VARCHAR(2) NOT NULL DEFAULT 'ao',         -- v2.1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- contacts — rede de confiança: ambos endpoints são utilizadores RideFriend
CREATE TABLE public.contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_type      contact_group NOT NULL DEFAULT 'friend',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT contacts_unique_pair UNIQUE (user_id, contact_user_id),
  CONSTRAINT contacts_no_self CHECK (user_id <> contact_user_id)
);

-- locations — GPS tracking em tempo real (NÃO paragens favoritas)
-- Uma linha por utilizador (upsert). is_active=false quando trocar para offline.
CREATE TABLE public.locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  lat         DECIMAL(10,8) NOT NULL,
  lng         DECIMAL(11,8) NOT NULL,
  accuracy    NUMERIC(8,2),                                 -- metros
  mode        location_mode NOT NULL DEFAULT 'passenger',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  heading     NUMERIC(5,2),                                 -- graus 0-360
  speed       NUMERIC(6,2),                                 -- m/s
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- rides — boleias entre utilizadores
CREATE TABLE public.rides (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  passenger_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  status       ride_status NOT NULL DEFAULT 'requested',
  origin_lat   DECIMAL(10,8) NOT NULL,
  origin_lng   DECIMAL(11,8) NOT NULL,
  dest_lat     DECIMAL(10,8),
  dest_lng     DECIMAL(11,8),
  distance_km  NUMERIC(8,3),
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  market_code  VARCHAR(2) NOT NULL DEFAULT 'ao',            -- v2.1
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ratings — avaliações pós-boleia (1-5)
CREATE TABLE public.ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id    UUID NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  rater_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rated_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score      SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratings_unique_per_ride_rater UNIQUE (ride_id, rater_id)
);

-- notifications — push + in-app
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        VARCHAR(60) NOT NULL,                          -- driver_approaching|ride_request|...
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  market_code VARCHAR(2) NOT NULL DEFAULT 'ao',              -- v2.1
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- sos_events — eventos SOS (com lat/lng e ride opcional)
CREATE TABLE public.sos_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id       UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  lat           DECIMAL(10,8) NOT NULL,
  lng           DECIMAL(11,8) NOT NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- bus_stops — paragens conhecidas por mercado (v2.1 NOVO)
CREATE TABLE public.bus_stops (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_code VARCHAR(2) NOT NULL,
  city        VARCHAR(80) NOT NULL,
  name        VARCHAR(120) NOT NULL,
  lat         DECIMAL(10,8) NOT NULL,
  lng         DECIMAL(11,8) NOT NULL,
  is_major    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

------------------------------------------------------------
-- 4. ÍNDICES (incluindo GIST geográfico em locations)
------------------------------------------------------------
CREATE INDEX users_market_code_idx       ON public.users (market_code);
CREATE INDEX users_phone_idx             ON public.users (phone);
CREATE INDEX contacts_user_id_idx        ON public.contacts (user_id);
CREATE INDEX contacts_contact_user_id_idx ON public.contacts (contact_user_id);
CREATE INDEX locations_geo_gist_idx      ON public.locations USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326));
CREATE INDEX locations_active_idx        ON public.locations (is_active) WHERE is_active = true;
CREATE INDEX rides_driver_status_idx     ON public.rides (driver_id, status);
CREATE INDEX rides_passenger_idx         ON public.rides (passenger_id);
CREATE INDEX rides_market_idx            ON public.rides (market_code);
CREATE INDEX notifications_user_id_idx   ON public.notifications (user_id);
CREATE INDEX ratings_rated_id_idx        ON public.ratings (rated_id);
CREATE INDEX bus_stops_market_idx        ON public.bus_stops (market_code);
CREATE INDEX bus_stops_geo_gist_idx      ON public.bus_stops USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326));

------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
------------------------------------------------------------
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_stops     ENABLE ROW LEVEL SECURITY;

-- users: o utilizador vê o próprio perfil; contactos podem ver perfis básicos
CREATE POLICY users_select_self_or_contact ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.user_id = auth.uid() AND c.contact_user_id = users.id
    )
  );
CREATE POLICY users_insert_self ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);
CREATE POLICY users_update_self ON public.users FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- contacts: o utilizador só vê e gere os seus próprios contactos
CREATE POLICY contacts_owner_all ON public.contacts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- locations: o utilizador vê a sua + apenas dos contactos directos (REGRA P0)
CREATE POLICY locations_select_own_or_contact ON public.locations FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.contacts c
      WHERE c.user_id = auth.uid() AND c.contact_user_id = locations.user_id
    )
  );
CREATE POLICY locations_upsert_self ON public.locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY locations_update_self ON public.locations FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- rides: só os participantes têm acesso
CREATE POLICY rides_participants_select ON public.rides FOR SELECT
  USING (auth.uid() IN (driver_id, passenger_id));
CREATE POLICY rides_passenger_insert ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY rides_participants_update ON public.rides FOR UPDATE
  USING (auth.uid() IN (driver_id, passenger_id))
  WITH CHECK (auth.uid() IN (driver_id, passenger_id));

-- ratings: ver e criar pelos participantes da boleia
CREATE POLICY ratings_participants_select ON public.ratings FOR SELECT
  USING (auth.uid() IN (rater_id, rated_id));
CREATE POLICY ratings_rater_insert ON public.ratings FOR INSERT
  WITH CHECK (auth.uid() = rater_id);

-- notifications: só o destinatário
CREATE POLICY notifications_owner_all ON public.notifications FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sos_events: só o próprio utilizador (admin/painel via service role)
CREATE POLICY sos_events_owner_all ON public.sos_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- bus_stops: SELECT para qualquer utilizador autenticado (v2.1 explicit)
CREATE POLICY bus_stops_select_authenticated ON public.bus_stops FOR SELECT
  USING (auth.role() = 'authenticated');

------------------------------------------------------------
-- 6. FUNÇÕES (geo)
------------------------------------------------------------

-- nearby_drivers: motoristas activos da rede de contactos do utilizador.
-- Inclui distância (km) e ETA (min) calculados no servidor a 30 km/h.
CREATE OR REPLACE FUNCTION public.nearby_drivers(
  p_user_id   UUID,
  p_radius_km NUMERIC
)
RETURNS TABLE (
  driver_id    UUID,
  name         VARCHAR,
  phone        VARCHAR,
  photo_url    TEXT,
  rating_avg   NUMERIC,
  group_type   contact_group,
  lat          DECIMAL,
  lng          DECIMAL,
  heading      NUMERIC,
  speed        NUMERIC,
  distance_km  NUMERIC,
  eta_minutes  NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH me AS (
    SELECT lat, lng FROM public.locations
    WHERE user_id = p_user_id AND is_active = true
  )
  SELECT
    u.id,
    u.name,
    u.phone,
    u.photo_url,
    u.rating_avg,
    c.group_type,
    l.lat,
    l.lng,
    l.heading,
    l.speed,
    ROUND(
      (ST_DistanceSphere(
        ST_MakePoint(l.lng, l.lat),
        ST_MakePoint(me.lng, me.lat)
      ) / 1000.0)::NUMERIC,
      2
    ) AS distance_km,
    ROUND(
      (ST_DistanceSphere(
        ST_MakePoint(l.lng, l.lat),
        ST_MakePoint(me.lng, me.lat)
      ) / 1000.0 / 30.0 * 60.0)::NUMERIC,
      1
    ) AS eta_minutes
  FROM public.contacts c
  JOIN public.users u    ON u.id = c.contact_user_id AND u.is_driver = true
  JOIN public.locations l ON l.user_id = u.id AND l.is_active = true AND l.mode = 'driver'
  CROSS JOIN me
  WHERE c.user_id = p_user_id
    AND ST_DWithin(
      geography(ST_MakePoint(l.lng, l.lat)),
      geography(ST_MakePoint(me.lng, me.lat)),
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT 50;
$$;

-- nearby_passengers: passageiros (contactos do motorista) perto da rota.
-- Filtra por proximidade ao segmento origem→destino (distância máx em metros).
CREATE OR REPLACE FUNCTION public.nearby_passengers(
  p_driver_id    UUID,
  p_origin_lat   NUMERIC,
  p_origin_lng   NUMERIC,
  p_dest_lat     NUMERIC,
  p_dest_lng     NUMERIC,
  p_radius_m     INT
)
RETURNS TABLE (
  passenger_id  UUID,
  name          VARCHAR,
  phone         VARCHAR,
  photo_url     TEXT,
  group_type    contact_group,
  lat           DECIMAL,
  lng           DECIMAL,
  detour_m      NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH route AS (
    SELECT ST_MakeLine(
      ST_SetSRID(ST_MakePoint(p_origin_lng, p_origin_lat), 4326)::geometry,
      ST_SetSRID(ST_MakePoint(p_dest_lng,   p_dest_lat),   4326)::geometry
    ) AS line
  )
  SELECT
    u.id,
    u.name,
    u.phone,
    u.photo_url,
    c.group_type,
    l.lat,
    l.lng,
    ROUND(
      ST_Distance(
        geography(ST_MakePoint(l.lng, l.lat)),
        geography(route.line)
      )::NUMERIC,
      0
    ) AS detour_m
  FROM public.contacts c
  JOIN public.users u    ON u.id = c.contact_user_id
  JOIN public.locations l ON l.user_id = u.id AND l.is_active = true AND l.mode = 'passenger'
  CROSS JOIN route
  WHERE c.user_id = p_driver_id
    AND ST_DWithin(
      geography(ST_MakePoint(l.lng, l.lat)),
      geography(route.line),
      p_radius_m
    )
  ORDER BY detour_m ASC
  LIMIT 50;
$$;

-- nearby_passengers_at_stop: passageiros (contactos) na mesma paragem que o utilizador.
-- Usado pela secção "Outros na Paragem" do PassengerHomeScreen (P5).
CREATE OR REPLACE FUNCTION public.nearby_passengers_at_stop(
  p_user_id  UUID,
  p_radius_m INT
)
RETURNS TABLE (
  passenger_id  UUID,
  name          VARCHAR,
  phone         VARCHAR,
  photo_url     TEXT,
  group_type    contact_group,
  lat           DECIMAL,
  lng           DECIMAL,
  distance_m    NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH me AS (
    SELECT lat, lng FROM public.locations
    WHERE user_id = p_user_id AND is_active = true
  )
  SELECT
    u.id,
    u.name,
    u.phone,
    u.photo_url,
    c.group_type,
    l.lat,
    l.lng,
    ROUND(
      ST_DistanceSphere(
        ST_MakePoint(l.lng, l.lat),
        ST_MakePoint(me.lng, me.lat)
      )::NUMERIC,
      0
    ) AS distance_m
  FROM public.contacts c
  JOIN public.users u    ON u.id = c.contact_user_id
  JOIN public.locations l ON l.user_id = u.id AND l.is_active = true AND l.mode = 'passenger'
  CROSS JOIN me
  WHERE c.user_id = p_user_id
    AND ST_DWithin(
      geography(ST_MakePoint(l.lng, l.lat)),
      geography(ST_MakePoint(me.lng, me.lat)),
      p_radius_m
    )
  ORDER BY distance_m ASC
  LIMIT 25;
$$;

-- nearest_stop: paragem mais próxima no mercado (v2.1)
CREATE OR REPLACE FUNCTION public.nearest_stop(
  p_lat      NUMERIC,
  p_lng      NUMERIC,
  p_market   VARCHAR,
  p_radius_m INT
)
RETURNS TABLE (
  id         UUID,
  name       VARCHAR,
  city       VARCHAR,
  lat        DECIMAL,
  lng        DECIMAL,
  is_major   BOOLEAN,
  distance_m NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    bs.id,
    bs.name,
    bs.city,
    bs.lat,
    bs.lng,
    bs.is_major,
    ROUND(
      ST_DistanceSphere(
        ST_MakePoint(bs.lng, bs.lat),
        ST_MakePoint(p_lng, p_lat)
      )::NUMERIC,
      0
    ) AS distance_m
  FROM public.bus_stops bs
  WHERE bs.market_code = p_market
    AND ST_DWithin(
      geography(ST_MakePoint(bs.lng, bs.lat)),
      geography(ST_MakePoint(p_lng, p_lat)),
      p_radius_m
    )
  ORDER BY distance_m ASC
  LIMIT 1;
$$;

------------------------------------------------------------
-- 7. TRIGGERS
------------------------------------------------------------

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at      BEFORE UPDATE ON public.users      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER locations_set_updated_at  BEFORE UPDATE ON public.locations  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER rides_set_updated_at      BEFORE UPDATE ON public.rides      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- recalcular rating_avg em users após mudanças em ratings
CREATE OR REPLACE FUNCTION public.refresh_user_rating_avg()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.rated_id, OLD.rated_id);
  UPDATE public.users
     SET rating_avg = COALESCE((
       SELECT AVG(score)::NUMERIC(3,2)
       FROM public.ratings
       WHERE rated_id = target_id
     ), 0)
   WHERE id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER ratings_refresh_avg
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION public.refresh_user_rating_avg();

------------------------------------------------------------
-- 8. SEED — paragens dos 5 mercados (v2.1)
------------------------------------------------------------
INSERT INTO public.bus_stops (market_code, city, name, lat, lng, is_major) VALUES
  -- Angola (Luanda)
  ('ao', 'Luanda',     'Av. Lenine · Paragem Central',   -8.81470000,  13.23020000, true),
  ('ao', 'Luanda',     'Talatona · Shopping',            -8.91860000,  13.18470000, true),
  ('ao', 'Luanda',     'Viana · Paragem Principal',      -8.90390000,  13.37280000, true),
  ('ao', 'Luanda',     'Largo do Kinaxixe',              -8.82000000,  13.23500000, true),
  ('ao', 'Luanda',     'Cacuaco · Centro',               -8.77640000,  13.28480000, true),
  -- Moçambique (Maputo)
  ('mz', 'Maputo',     'Terminal Museu',                 -25.96920000, 32.57320000, true),
  ('mz', 'Maputo',     'Mercado Central',                -25.96530000, 32.57910000, true),
  -- Brasil (São Paulo)
  ('br', 'São Paulo',  'Terminal Jabaquara',             -23.64270000, -46.65340000, true),
  ('br', 'São Paulo',  'Av. Paulista c/ Consolação',     -23.56140000, -46.65650000, true),
  -- Portugal (Lisboa)
  ('pt', 'Lisboa',     'Marquês de Pombal',              38.72520000,  -9.15000000, true),
  ('pt', 'Lisboa',     'Oriente',                        38.76810000,  -9.09900000, true),
  -- Nigéria (Lagos)
  ('ng', 'Lagos',      'Oshodi Terminal',                6.54800000,   3.35400000, true),
  ('ng', 'Lagos',      'CMS Bus Stop',                   6.45360000,   3.39400000, true);

-- Nota: utilizadores seed devem ser criados via auth.signUp() para obter auth.uid()
-- consistente. O ficheiro supabase/seed.sql (P11) faz isso para dev/staging.
