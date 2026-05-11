-- Ficheiro: supabase/seed.sql | Função: dados de teste realistas para desenvolvimento (P11)
-- Como correr:
--   1. Aplica `ridefriend/supabase_setup_v2.sql` antes deste seed (cria as tabelas e RLS).
--   2. Para correr este seed sem topar com RLS, executa-o no SQL Editor da Supabase
--      (que corre como service_role) ou prefixa com:
--          SET LOCAL ROLE service_role;
--   3. O seed é idempotente — usa ON CONFLICT DO NOTHING / UPDATE para poderes correr várias vezes.
--
-- Nota: a tabela `users` no v2.1 não tem campos de viatura. Para os 2 motoristas, a metadata
-- da viatura fica no MMKV local da app (settings.vehicle); quando for adicionado um modelo
-- `vehicles`, popular aqui.

BEGIN;

-- ─── 1. UTILIZADORES ─────────────────────────────────────────────────────────
-- IDs fixos para podermos referir-nos a eles em contactos/rides/ratings abaixo.

INSERT INTO public.users (id, phone, name, email, home_area, is_driver, rating_avg, ride_count, market_code, created_at)
VALUES
  -- Ingombota (centro): 3 utilizadores
  ('11111111-0000-0000-0000-000000000001', '+244923100001', 'Ana Domingos',     'ana.domingos@example.ao',    'Ingombota', false, 4.8, 12, 'ao', NOW() - INTERVAL '90 days'),
  ('11111111-0000-0000-0000-000000000002', '+244923100002', 'Carlos Mateus',    'carlos.mateus@example.ao',   'Ingombota', true,  4.9, 47, 'ao', NOW() - INTERVAL '120 days'),
  ('11111111-0000-0000-0000-000000000003', '+244923100003', 'Beatriz Sousa',    'beatriz.sousa@example.ao',   'Ingombota', false, 4.6,  8, 'ao', NOW() - INTERVAL '60 days'),

  -- Talatona (sul): 2 utilizadores
  ('22222222-0000-0000-0000-000000000001', '+244923200001', 'João Pedro',       'joao.pedro@example.ao',      'Talatona',  true,  4.7, 31, 'ao', NOW() - INTERVAL '180 days'),
  ('22222222-0000-0000-0000-000000000002', '+244923200002', 'Mariana Tavares',  'mariana.t@example.ao',       'Talatona',  false, 4.9, 18, 'ao', NOW() - INTERVAL '45 days'),

  -- Viana (leste): 2 utilizadores
  ('33333333-0000-0000-0000-000000000001', '+244923300001', 'Domingos Sebastião','domingos.s@example.ao',     'Viana',     false, 4.5,  5, 'ao', NOW() - INTERVAL '30 days'),
  ('33333333-0000-0000-0000-000000000002', '+244923300002', 'Esperança Lopes',  'esperanca.lopes@example.ao', 'Viana',     false, 5.0,  3, 'ao', NOW() - INTERVAL '15 days'),

  -- Cacuaco (norte): 1 utilizador
  ('44444444-0000-0000-0000-000000000001', '+244923400001', 'Pedro Cassinda',   'pedro.cassinda@example.ao',  'Cacuaco',   false, 4.4,  2, 'ao', NOW() - INTERVAL '7 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  home_area = EXCLUDED.home_area,
  is_driver = EXCLUDED.is_driver,
  rating_avg = EXCLUDED.rating_avg,
  ride_count = EXCLUDED.ride_count;

-- ─── 2. LOCALIZAÇÕES ACTIVAS ─────────────────────────────────────────────────
-- 4 utilizadores com tracking activo nos últimos minutos (visíveis no mapa).
-- Os outros 4 não têm registo em locations → consideram-se offline.

INSERT INTO public.locations (user_id, lat, lng, accuracy, mode, is_active, heading, speed, updated_at)
VALUES
  -- Carlos (motorista Ingombota) — perto do Largo do Kinaxixi
  ('11111111-0000-0000-0000-000000000002', -8.8133, 13.2356, 8,  'driver',    true, 45,  6.4, NOW() - INTERVAL '40 seconds'),
  -- Ana (passageira Ingombota) — Marginal
  ('11111111-0000-0000-0000-000000000001', -8.8231, 13.2398, 12, 'passenger', true, 0,   0,   NOW() - INTERVAL '2 minutes'),
  -- João (motorista Talatona) — Belas Shopping
  ('22222222-0000-0000-0000-000000000001', -8.9214, 13.1838, 6,  'driver',    true, 270, 11.2, NOW() - INTERVAL '90 seconds'),
  -- Mariana (passageira Talatona) — Talatona Park
  ('22222222-0000-0000-0000-000000000002', -8.9156, 13.1812, 10, 'passenger', true, 0,   0,   NOW() - INTERVAL '4 minutes')
ON CONFLICT (user_id) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  accuracy = EXCLUDED.accuracy,
  mode = EXCLUDED.mode,
  is_active = EXCLUDED.is_active,
  heading = EXCLUDED.heading,
  speed = EXCLUDED.speed,
  updated_at = EXCLUDED.updated_at;

-- ─── 3. CONTACTOS (rede de confiança) ────────────────────────────────────────
-- Ana ↔ Carlos (colegas)     · Ana ↔ Beatriz (família)   · Ana ↔ Mariana (amigos)
-- Carlos ↔ João (colegas — ambos motoristas)             · Carlos ↔ Beatriz (amigos)
-- Mariana ↔ João (amigos)    · Mariana ↔ Esperança (família)
-- Domingos ↔ Esperança (família)                         · Pedro ↔ Carlos (vizinhos)
-- A rede é bidireccional (ambas as direcções inseridas).

INSERT INTO public.contacts (user_id, contact_user_id, group_type)
VALUES
  ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'colleague'),
  ('11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'colleague'),

  ('11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'family'),
  ('11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'family'),

  ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'friend'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'friend'),

  ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'colleague'),
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'colleague'),

  ('11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'friend'),
  ('11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'friend'),

  ('22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'friend'),
  ('22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'friend'),

  ('22222222-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'family'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', 'family'),

  ('33333333-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 'family'),
  ('33333333-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000001', 'family'),

  ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'neighbour'),
  ('11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 'neighbour')
ON CONFLICT (user_id, contact_user_id) DO NOTHING;

-- ─── 4. BOLEIAS HISTÓRICAS (5 completed) ────────────────────────────────────
-- Cada uma com origem/destino plausíveis em Luanda e timestamps relativos.

INSERT INTO public.rides (
  id, driver_id, passenger_id, status,
  origin_lat, origin_lng, dest_lat, dest_lng, distance_km,
  started_at, ended_at, market_code, created_at
) VALUES
  -- Carlos leva Ana de Ingombota → Talatona (≈ 13 km)
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'completed',
   -8.8147, 13.2302, -8.9186, 13.1847, 13.20,
   NOW() - INTERVAL '14 days' + INTERVAL '8 hours',
   NOW() - INTERVAL '14 days' + INTERVAL '8 hours 35 minutes',
   'ao', NOW() - INTERVAL '14 days'),

  -- João leva Mariana dentro de Talatona (≈ 2 km)
  ('aaaaaaaa-0000-0000-0000-000000000002',
   '22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002',
   'completed',
   -8.9214, 13.1838, -8.9050, 13.1801, 2.10,
   NOW() - INTERVAL '10 days' + INTERVAL '18 hours',
   NOW() - INTERVAL '10 days' + INTERVAL '18 hours 12 minutes',
   'ao', NOW() - INTERVAL '10 days'),

  -- Carlos leva Beatriz de Ingombota → Cacuaco (≈ 18 km)
  ('aaaaaaaa-0000-0000-0000-000000000003',
   '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003',
   'completed',
   -8.8133, 13.2356, -8.7780, 13.3789, 18.40,
   NOW() - INTERVAL '7 days' + INTERVAL '7 hours 30 minutes',
   NOW() - INTERVAL '7 days' + INTERVAL '8 hours 25 minutes',
   'ao', NOW() - INTERVAL '7 days'),

  -- João leva Esperança de Talatona → Viana (≈ 22 km)
  ('aaaaaaaa-0000-0000-0000-000000000004',
   '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002',
   'completed',
   -8.9214, 13.1838, -8.9039, 13.3728, 22.10,
   NOW() - INTERVAL '5 days' + INTERVAL '19 hours',
   NOW() - INTERVAL '5 days' + INTERVAL '19 hours 55 minutes',
   'ao', NOW() - INTERVAL '5 days'),

  -- Carlos leva Pedro de Cacuaco → Ingombota (≈ 16 km, viagem matinal)
  ('aaaaaaaa-0000-0000-0000-000000000005',
   '11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001',
   'completed',
   -8.7780, 13.3789, -8.8147, 13.2302, 16.50,
   NOW() - INTERVAL '2 days' + INTERVAL '6 hours 30 minutes',
   NOW() - INTERVAL '2 days' + INTERVAL '7 hours 20 minutes',
   'ao', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  ended_at = EXCLUDED.ended_at,
  distance_km = EXCLUDED.distance_km;

-- ─── 5. AVALIAÇÕES BIDIRECCIONAIS ────────────────────────────────────────────
-- Para cada boleia, passageiro avalia o motorista e vice-versa.

INSERT INTO public.ratings (ride_id, rater_id, rated_id, score, comment) VALUES
  -- Ride 1 (Carlos/Ana)
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 5, 'Pontual e simpático'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 5, NULL),

  -- Ride 2 (João/Mariana)
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 5, 'Carro limpo'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 5, NULL),

  -- Ride 3 (Carlos/Beatriz)
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 4, 'Boa conversa'),
  ('aaaaaaaa-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 5, NULL),

  -- Ride 4 (João/Esperança)
  ('aaaaaaaa-0000-0000-0000-000000000004', '33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 5, 'Excelente'),
  ('aaaaaaaa-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', 5, NULL),

  -- Ride 5 (Carlos/Pedro)
  ('aaaaaaaa-0000-0000-0000-000000000005', '44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 4, NULL),
  ('aaaaaaaa-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000001', 4, 'Pontual')
ON CONFLICT (ride_id, rater_id) DO UPDATE SET
  score = EXCLUDED.score,
  comment = EXCLUDED.comment;

-- ─── 6. PARAGENS CONHECIDAS (bus_stops) ──────────────────────────────────────
-- Algumas paragens reais usadas pelo `nearestStop` no PassengerHome.

INSERT INTO public.bus_stops (market_code, city, name, lat, lng, is_major) VALUES
  ('ao', 'Luanda', 'Largo do Kinaxixi',       -8.8133, 13.2389, true),
  ('ao', 'Luanda', 'Mutamba',                 -8.8147, 13.2302, true),
  ('ao', 'Luanda', 'Marginal de Luanda',      -8.8231, 13.2398, false),
  ('ao', 'Luanda', 'Belas Shopping',          -8.9214, 13.1838, true),
  ('ao', 'Luanda', 'Talatona Park',           -8.9156, 13.1812, false),
  ('ao', 'Luanda', 'Centralidade do Kilamba', -8.9989, 13.2603, true),
  ('ao', 'Luanda', 'Viana Park',              -8.9039, 13.3728, true),
  ('ao', 'Luanda', 'Cacuaco Centro',          -8.7780, 13.3789, true)
ON CONFLICT DO NOTHING;

COMMIT;

-- ─── DIAGNÓSTICO ─────────────────────────────────────────────────────────────
-- Confere os totais após o seed:
--   SELECT 'users' tabela, COUNT(*) n FROM public.users
--   UNION ALL SELECT 'contacts', COUNT(*) FROM public.contacts
--   UNION ALL SELECT 'locations', COUNT(*) FROM public.locations
--   UNION ALL SELECT 'rides', COUNT(*) FROM public.rides
--   UNION ALL SELECT 'ratings', COUNT(*) FROM public.ratings
--   UNION ALL SELECT 'bus_stops', COUNT(*) FROM public.bus_stops;
