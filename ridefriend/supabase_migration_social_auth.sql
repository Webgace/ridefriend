-- ============================================================
-- Migração: social auth (Google/Apple) + WhatsApp OTP + auto-admin
-- ============================================================
-- Depende de: supabase_migration_admin_and_banners.sql (cria users.is_admin
-- e users.terms_accepted_at). Esta migração pode correr antes ou depois de
-- supabase_migration_phantom_contacts.sql. Idempotente.
--
-- O que muda:
-- - users.phone passa a NULLABLE (utilizadores Google/Apple podem não ter
--   número de telemóvel no momento do registo)
-- - users.auth_provider VARCHAR (phone | google | apple | email) — auditoria
-- - app_config seed: 'otp_channel' (sms | whatsapp) e 'admin_emails' (CSV
--   de emails sempre promovidos a admin)
-- - Seed inicial: admin_emails = 'acalongo@gmail.com'
-- - public.ensure_admin_email() — trigger BEFORE INSERT/UPDATE em users que
--   promove automaticamente a is_admin = true se o email coincidir com a
--   lista admin_emails do app_config

BEGIN;

------------------------------------------------------------
-- 1) users: phone opcional + auth_provider
------------------------------------------------------------
ALTER TABLE public.users
  ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'phone';

-- Constraint sanity: só estes valores são esperados pela app.
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_auth_provider_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_auth_provider_check
    CHECK (auth_provider IN ('phone', 'google', 'apple', 'email'));

------------------------------------------------------------
-- 2) app_config: novas chaves (idempotente)
------------------------------------------------------------
INSERT INTO public.app_config (key, value) VALUES
  ('otp_channel',   'sms'),                  -- 'sms' | 'whatsapp'
  ('admin_emails',  'acalongo@gmail.com')    -- CSV; espaços tolerados
ON CONFLICT (key) DO UPDATE
  -- só faz overwrite se o valor actual for NULL — não sobrepõe edições do admin
  SET value = COALESCE(public.app_config.value, EXCLUDED.value);

------------------------------------------------------------
-- 3) Trigger: promover a admin se o email coincidir com admin_emails
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  csv TEXT;
  emails TEXT[];
BEGIN
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RETURN NEW;
  END IF;
  SELECT value INTO csv FROM public.app_config WHERE key = 'admin_emails';
  IF csv IS NULL OR csv = '' THEN
    RETURN NEW;
  END IF;
  -- normaliza: trim espaços + lowercase. emails é um array de TEXT.
  emails := ARRAY(
    SELECT lower(trim(unnest)) FROM unnest(string_to_array(csv, ','))
  );
  IF lower(NEW.email) = ANY(emails) THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_ensure_admin_email ON public.users;
CREATE TRIGGER users_ensure_admin_email
  BEFORE INSERT OR UPDATE OF email ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_admin_email();

------------------------------------------------------------
-- 4) Backfill: promove imediatamente quem já existe com o email admin
------------------------------------------------------------
UPDATE public.users
   SET is_admin = true
 WHERE lower(email) IN (
   SELECT lower(trim(unnest))
     FROM unnest(string_to_array(
       (SELECT value FROM public.app_config WHERE key = 'admin_emails'),
       ','
     ))
 )
 AND is_admin = false;

COMMIT;

-- ============================================================
-- Pós-migração:
--   1) No dashboard Supabase → Authentication → Providers, activar:
--      - Google (OAuth client iOS + Android + Web do GCP)
--      - Apple (Services ID + Sign in with Apple key)
--   2) Authentication → Phone → Provider = Twilio Verify;
--      Channel default = WhatsApp (ou SMS); número WhatsApp Business aprovado.
--   3) Para adicionar mais admins:
--      UPDATE public.app_config
--         SET value = 'acalongo@gmail.com, novo@dominio.com'
--       WHERE key = 'admin_emails';
--      (utilizadores existentes com esse email são promovidos no próximo
--       UPDATE do email ou via INSERT manual; também podes correr o backfill
--       deste ficheiro novamente — é idempotente.)
-- ============================================================
