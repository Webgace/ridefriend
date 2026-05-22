-- ============================================================
-- Migração: contactos "phantom" (sem conta RideFriend ainda)
-- ============================================================
-- Para correr UMA vez sobre o schema existente (supabase_setup_v2.sql).
-- Idempotente: pode ser re-executada com segurança.
--
-- O que muda:
-- - contacts.contact_user_id passa a NULLABLE
-- - Adicionadas colunas alias_name, alias_phone, phone_normalized
-- - Trigger BEFORE INSERT/UPDATE mantém phone_normalized sincronizada
-- - Trigger AFTER INSERT em users liga retroactivamente contactos phantom
--   quando alguém se regista com um número que já foi adicionado por outros
-- - CHECKs e UNIQUE INDEX adaptados para suportar contact_user_id NULL

BEGIN;

------------------------------------------------------------
-- 1) contacts: contact_user_id passa a nullable + novas colunas
------------------------------------------------------------
ALTER TABLE public.contacts
  ALTER COLUMN contact_user_id DROP NOT NULL;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS alias_name       VARCHAR(80),
  ADD COLUMN IF NOT EXISTS alias_phone      VARCHAR(40),
  ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(40);

------------------------------------------------------------
-- 2) Helper: normalize_phone(text) → text
--    Remove tudo que não é dígito + remove "0" inicial (formato local).
--    Idempotente: pode-se aplicar duas vezes que dá o mesmo resultado.
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  digits TEXT;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(digits) > 1 AND substring(digits FROM 1 FOR 1) = '0' THEN
    digits := substring(digits FROM 2);
  END IF;
  IF length(digits) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN digits;
END;
$$;

------------------------------------------------------------
-- 3) Trigger: phone_normalized sempre derivada de alias_phone
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_contact_phone_normalized()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.phone_normalized := public.normalize_phone(NEW.alias_phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_sync_phone_normalized ON public.contacts;
CREATE TRIGGER contacts_sync_phone_normalized
  BEFORE INSERT OR UPDATE OF alias_phone ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.sync_contact_phone_normalized();

-- Backfill (no-op se alias_phone ainda não existe nas linhas)
UPDATE public.contacts
   SET phone_normalized = public.normalize_phone(alias_phone)
 WHERE alias_phone IS NOT NULL
   AND (phone_normalized IS NULL OR phone_normalized <> public.normalize_phone(alias_phone));

------------------------------------------------------------
-- 4) Constraints: aceitar contact_user_id NULL, mas
--    exigir pelo menos um endpoint (utilizador OU telefone)
------------------------------------------------------------
ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_no_self;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_no_self CHECK (
    contact_user_id IS NULL OR user_id <> contact_user_id
  );

ALTER TABLE public.contacts
  DROP CONSTRAINT IF EXISTS contacts_has_endpoint;
ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_has_endpoint CHECK (
    contact_user_id IS NOT NULL OR phone_normalized IS NOT NULL
  );

------------------------------------------------------------
-- 5) Unicidade para linhas phantom (mesmo utilizador não pode ter
--    o mesmo número adicionado duas vezes como phantom).
--    A constraint contacts_unique_pair já trata o caso de contactos
--    com utilizador real ligado.
------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS contacts_phantom_unique_idx
  ON public.contacts (user_id, phone_normalized)
  WHERE contact_user_id IS NULL;

CREATE INDEX IF NOT EXISTS contacts_phone_normalized_idx
  ON public.contacts (phone_normalized)
  WHERE contact_user_id IS NULL;

------------------------------------------------------------
-- 6) Auto-link: quando alguém se regista com um número que já foi
--    adicionado como phantom por outros utilizadores, esses contactos
--    passam a estar ligados (deixam de ser phantom).
--    SECURITY DEFINER porque actualiza linhas de OUTROS user_id.
------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.link_phantom_contacts_on_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_norm TEXT;
BEGIN
  v_norm := public.normalize_phone(NEW.phone);
  -- Defesa: ignora números demasiado curtos (improváveis matches reais).
  IF v_norm IS NULL OR length(v_norm) < 6 THEN
    RETURN NEW;
  END IF;

  UPDATE public.contacts
     SET contact_user_id = NEW.id
   WHERE contact_user_id IS NULL
     AND phone_normalized = v_norm
     AND user_id <> NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_link_phantom_contacts ON public.users;
CREATE TRIGGER users_link_phantom_contacts
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.link_phantom_contacts_on_user_insert();

------------------------------------------------------------
-- 7) (Opcional) Política RLS — não muda. A existente
--    `contacts_owner_all (auth.uid() = user_id)` aplica-se na
--    mesma a linhas phantom (têm user_id do dono).
------------------------------------------------------------

COMMIT;

-- ============================================================
-- Verificação rápida pós-migração:
--
-- SELECT column_name, is_nullable, data_type
--   FROM information_schema.columns
--  WHERE table_name = 'contacts' AND table_schema = 'public';
--
-- SELECT public.normalize_phone('+244 924 546 880');  -- esperado: "244924546880"
-- SELECT public.normalize_phone('0924546880');         -- esperado: "924546880"
-- ============================================================
