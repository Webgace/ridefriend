# Setup: Login social (Google / Apple) + OTP por WhatsApp

Checklist para activar Google, Apple e WhatsApp OTP. Tudo no código já está
em vigor — só faltam as configurações externas (Supabase, GCP, Apple Developer,
Twilio) e uma rebuild EAS.

---

## 0. Pré-requisitos no código

```bash
cd ridefriend
npm install                 # picks up @react-native-google-signin/google-signin,
                            #          expo-apple-authentication, expo-crypto, expo-web-browser
npx expo install --fix      # alinha versões ao SDK 54 (recomendado)
```

> Google usa o SDK nativo `@react-native-google-signin/google-signin` (Credential
> Manager), **não** `expo-auth-session` — o flow custom-URI foi desactivado pelo
> Google em Abril 2024. O `expo-auth-session` continua nas deps mas já não é usado
> no login.

Correr a migração SQL no projecto Supabase (Dashboard → SQL Editor):

```
supabase_migration_social_auth.sql
```

Ela:
- torna `users.phone` nullable (OAuth não tem telefone),
- adiciona `users.auth_provider` (`phone | google | apple | email`),
- semeia `app_config.otp_channel = 'sms'` e `app_config.admin_emails = 'acalongo@gmail.com'`,
- cria trigger `ensure_admin_email()` que promove a admin qualquer `users.email`
  presente em `admin_emails` (a `acalongo@gmail.com` fica admin automaticamente).

---

## 1. Google Sign-In

1. **Google Cloud Console** (https://console.cloud.google.com) → cria
   projecto "RideFriend" (ou usa existente).
2. **APIs & Services → Credentials**, cria três OAuth client IDs:
   - **iOS** — Bundle ID `com.friendride.app`.
   - **Android** — package name `com.friendride.app` + SHA-1 das chaves de
     debug **e** release. Para a chave EAS, vai a EAS dashboard → Project →
     Credentials → Android → keystore → copia o SHA-1.
   - **Web** — usado pelo Supabase para validar o `id_token`. Deixa o URI
     vazio (ou põe `https://<project>.supabase.co/auth/v1/callback`).
3. **Supabase Dashboard → Authentication → Providers → Google** → activa,
   cola **Web client ID** e **Web client secret**, guarda.
4. **No app**, copia os três client IDs para `app.json` → `extra`:
   ```jsonc
   "extra": {
     "googleIosClientId": "1234-abc.apps.googleusercontent.com",
     "googleAndroidClientId": "1234-def.apps.googleusercontent.com",
     "googleWebClientId": "1234-ghi.apps.googleusercontent.com"
   }
   ```
   (Ou define `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` no `.env` — também é lido.)
   > Já estão preenchidos em `app.json` com os IDs do projecto GCP `1027420415056`.
   > O `SocialAuthButtons` lê `googleIosClientId` + `googleWebClientId`; o Android
   > resolve via SHA-1 registado no GCP, por isso não precisa de client ID em runtime.
   > O plugin `@react-native-google-signin/google-signin` em `app.json` traz o
   > `iosUrlScheme` correspondente ao iOS client ID.
5. **EAS rebuild** (Android + iOS) — o SDK nativo de Google Sign-In só
   funciona em builds, não em Expo Go.

---

## 2. Apple Sign-In

Só para iOS (Apple não permite no Android nem na web).

1. **Apple Developer** → Certificates, Identifiers & Profiles →
   **Identifiers**:
   - Selecciona o App ID `com.friendride.app` → activa **Sign in with Apple**.
2. **Capabilities**: a flag `usesAppleSignIn: true` em `app.json` já está
   posta — o EAS adiciona o entitlement automaticamente.
3. **Supabase Dashboard → Authentication → Providers → Apple** → activa.
   Em "Services ID" usa o bundle id `com.friendride.app` (Supabase aceita
   tanto Services IDs como Bundle IDs).
4. **EAS rebuild iOS**.

> Nota: pela política da App Store, se houver Google Sign-In no iOS, **tem**
> de existir também Apple Sign-In. O componente `SocialAuthButtons` já
> esconde o botão Apple em Android.

---

## 3. WhatsApp OTP (via Twilio Verify)

Não precisa de código novo — só configuração. Quando estiver pronto, o admin
muda o canal no painel da app (Perfil → Admin → "Canal de OTP").

1. **Twilio Console** → cria conta + carrega saldo.
2. **Verify** → cria um **Verify Service** (anota o `VA…` SID).
3. **Channels → WhatsApp** dentro desse Verify Service → activa.
4. **Senders → WhatsApp**: solicita aprovação de um número WhatsApp Business
   à Meta (1-2 semanas em média). Para teste, usa o sandbox Twilio
   (`whatsapp:+14155238886`).
5. **Supabase Dashboard → Authentication → Phone Auth**:
   - Provider: **Twilio Verify**.
   - Account SID + Auth Token + Verify Service SID (do passo 2).
   - "Allowed message channels": WhatsApp (e SMS se quiseres fallback).
6. No painel admin da app: **Perfil → Admin → Canal de OTP → WhatsApp**.
   A partir desse momento `sendOTP` envia via WhatsApp e a copy da
   `PhoneInputScreen` muda para "Recebes um código por WhatsApp".

---

## 4. Admin

- `acalongo@gmail.com` é admin por defeito (seed em `app_config.admin_emails`
  + trigger `ensure_admin_email`).
- Para adicionar outros admins, edita o campo "Admins" no painel
  (`Perfil → Admin → Configuração da app → Admins`).
- Lista CSV — espaços toleram-se, case-insensitive.
- Promoção é aplicada no próximo `INSERT/UPDATE` do email do utilizador
  (ou no backfill que corre uma vez ao executar a migração).

---

## 5. Smoke test

Após rebuild EAS + correr migração:

1. Abrir a app → "Continuar com Google" → escolher conta `acalongo@gmail.com` →
   completar onboarding (nome, mercado, T&C).
2. Verificar em Supabase:
   ```sql
   SELECT id, email, auth_provider, is_admin FROM users WHERE email = 'acalongo@gmail.com';
   ```
   Deve devolver `auth_provider = 'google'`, `is_admin = true`.
3. Na app → Perfil → "Painel Admin" deve estar visível.
4. Admin → Canal de OTP → WhatsApp → tentar registar outro telemóvel: o
   código deve chegar no WhatsApp.
