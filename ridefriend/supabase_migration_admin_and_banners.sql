-- ============================================================
-- Migração: T&C/role no signup + admin + banners + app_config
-- ============================================================
-- Independente de supabase_migration_phantom_contacts.sql.
-- Pode correr antes ou depois, em qualquer ordem.
-- Idempotente — re-execução é segura.
--
-- O que muda:
-- - users.is_admin BOOLEAN (default false) — flag para acesso ao painel admin
-- - users.terms_accepted_at TIMESTAMPTZ — timestamp de aceitação dos T&C/PP
-- - app_config (key/value) — URLs públicas configuráveis (website, suporte,
--   privacidade, termos) e outros valores controlados pelo admin
-- - banners — banners promocionais/comunicação por mercado, com janela activa
-- - public.is_current_user_admin() — helper SECURITY DEFINER usado em RLS
-- - Políticas RLS para app_config (read=todos auth, write=só admin) e banners
--   (read=todos auth dentro da janela, write=só admin)

BEGIN;

------------------------------------------------------------
-- 1) users: novas colunas
------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin           BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_accepted_at  TIMESTAMPTZ;

------------------------------------------------------------
-- 2) Helper: is_current_user_admin() — usado nas policies RLS
--    SECURITY DEFINER porque precisa de ler users sem ficar
--    sujeito à própria RLS da tabela users.
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE((
    SELECT is_admin FROM public.users WHERE id = auth.uid()
  ), false);
$$;

------------------------------------------------------------
-- 3) app_config: chave/valor para configuração editável pelo admin
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_config (
  key        VARCHAR(60)  PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by UUID         REFERENCES public.users(id) ON DELETE SET NULL
);

-- Seed de chaves esperadas pela app (idempotente: ON CONFLICT DO NOTHING)
INSERT INTO public.app_config (key, value) VALUES
  ('website_url',    NULL),
  ('support_email',  NULL),
  ('privacy_email',  NULL),
  ('privacy_url',    NULL),
  ('terms_url',      NULL)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_config_select_all ON public.app_config;
CREATE POLICY app_config_select_all
  ON public.app_config FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS app_config_insert_admin ON public.app_config;
CREATE POLICY app_config_insert_admin
  ON public.app_config FOR INSERT
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS app_config_update_admin ON public.app_config;
CREATE POLICY app_config_update_admin
  ON public.app_config FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

------------------------------------------------------------
-- 4) banners: comunicação editável pelo admin, com janela activa
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(120) NOT NULL,
  body        TEXT,
  image_url   TEXT,
  cta_label   VARCHAR(40),
  cta_url     TEXT,
  -- NULL = banner global; valor = só visível em utilizadores desse mercado
  market_code VARCHAR(2),
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  priority    INT          NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_by  UUID         REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS banners_active_window_idx
  ON public.banners (is_active, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS banners_market_idx
  ON public.banners (market_code);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Qualquer utilizador autenticado vê banners activos dentro da janela.
-- O filtro por mercado é feito no client (mais flexível) — o admin tem read total.
DROP POLICY IF EXISTS banners_select_active ON public.banners;
CREATE POLICY banners_select_active
  ON public.banners FOR SELECT
  USING (
    public.is_current_user_admin()
    OR (
      is_active = true
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at > NOW())
    )
  );

DROP POLICY IF EXISTS banners_insert_admin ON public.banners;
CREATE POLICY banners_insert_admin
  ON public.banners FOR INSERT
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS banners_update_admin ON public.banners;
CREATE POLICY banners_update_admin
  ON public.banners FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS banners_delete_admin ON public.banners;
CREATE POLICY banners_delete_admin
  ON public.banners FOR DELETE
  USING (public.is_current_user_admin());

------------------------------------------------------------
-- 5) Trigger: banners.updated_at em UPDATE
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_banners_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS banners_set_updated_at ON public.banners;
CREATE TRIGGER banners_set_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.set_banners_updated_at();

COMMIT;

-- ============================================================
-- Pós-migração:
--   1) Promover o primeiro admin manualmente (ainda não há UI):
--      UPDATE public.users SET is_admin = true WHERE phone = '+244...';
--   2) Verificar:
--      SELECT key, value FROM public.app_config;
--      SELECT * FROM public.banners;
-- ============================================================
