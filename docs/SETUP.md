# RideFriend — Guia de Setup do Ambiente de Desenvolvimento

Este documento descreve o setup completo passo a passo, do clone do repositório
ao primeiro `npx expo start` no telemóvel. Tempo estimado: **30–45 min**.

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|------------|---------------|---------------|
| Node.js    | 20 LTS        | <https://nodejs.org/> ou `nvm install 20 && nvm use 20` |
| Git        | 2.40+         | <https://git-scm.com/> |
| Expo CLI   | última        | já incluído via `npx expo` |
| Expo Go (telemóvel) | última | App Store / Play Store |
| Conta Supabase | —         | <https://supabase.com> (free tier serve) |
| Conta AfricasTalking | —   | <https://africastalking.com> (sandbox grátis) |

Opcional para o backend em produção:
- Conta na **Hostinger** (ou outro VPS Ubuntu 22.04)
- Domínio apontado para o VPS

---

## 2. Clone do repositório

```bash
git clone https://github.com/<organização>/ridefriend.git
cd ridefriend
```

Estrutura resumida:

```
ridefriend/             # app React Native (Expo)
backend/                # API Node.js + Express
supabase/seed.sql       # dados de teste
nginx/                  # config Nginx do VPS
scripts/deploy.sh       # bootstrap do VPS Ubuntu 22.04
.github/workflows/      # CI/CD
docs/                   # este guia + API.md
```

---

## 3. Setup do Supabase

### 3.1 Criar projecto
1. Entra em <https://supabase.com> → **New project**.
2. Escolhe região **South Africa (Johannesburg)** para latência Angola/Moçambique.
3. Guarda os valores que aparecem em **Project Settings → API**:
   - `Project URL` → vai ser `SUPABASE_URL`
   - `anon public` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secreta) → `SUPABASE_SERVICE_ROLE_KEY`
4. Em **Project Settings → API → JWT Settings**: copia o `JWT Secret` → `SUPABASE_JWT_SECRET`.
5. Em **Authentication → Providers → Phone**: liga AfricasTalking ou Twilio
   conforme o mercado.

### 3.2 Aplicar o schema
No **SQL Editor** da Supabase:

```sql
-- Cola e executa ridefriend/supabase_setup_v2.sql na íntegra
```

Confirma na aba **Table Editor** que apareceram `users`, `contacts`, `locations`,
`rides`, `ratings`, `notifications`, `sos_events`, `bus_stops`.

### 3.3 Aplicar o seed (opcional mas recomendado em dev)
No mesmo SQL Editor cola `supabase/seed.sql`. Vais ficar com 8 utilizadores
em Luanda, contactos cruzados, 5 boleias completadas e 4 localizações activas.

---

## 4. Configuração do `.env`

### 4.1 App Expo
Cria `ridefriend/.env` (não está em git):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_AFRICAS_TALKING_USERNAME=sandbox
EXPO_PUBLIC_AFRICAS_TALKING_API_KEY=atsk_...
EXPO_PUBLIC_TWILIO_ACCOUNT_SID=AC...
EXPO_PUBLIC_TWILIO_AUTH_TOKEN=...
EXPO_PUBLIC_TWILIO_FROM_NUMBER=+15555550100
EXPO_PUBLIC_TERMII_API_KEY=...
```

Apenas as chaves do mercado-alvo são obrigatórias (AfricasTalking para Angola,
Twilio para Brasil/Portugal, Termii para Nigéria).

### 4.2 Backend
Copia `backend/.env.example` para `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Preenche `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` e,
se vais expor publicamente, ajusta `CORS_ORIGINS`.

---

## 5. Instalar dependências

```bash
# App
cd ridefriend
npm install

# Backend
cd ../backend
npm install
```

---

## 6. Iniciar a app

```bash
cd ridefriend
npx expo start
```

- Abre **Expo Go** no telemóvel
- Faz scan ao QR Code no terminal/browser
- Se estás em rede móvel ou em redes restritivas, usa o modo tunnel:
  ```bash
  npx expo start --tunnel
  ```

Faz autenticação com um dos números seedados (`+244923100001` … `+244923400001`).
Como a Supabase entrega o OTP por SMS, em desenvolvimento podes habilitar
**Authentication → Providers → Phone → Enable phone confirmations: OFF**
e usar o OTP `123456` (default da Supabase em modo dev).

---

## 7. Iniciar o backend local

```bash
cd backend
npm run dev
```

A API fica em `http://localhost:3000`. Confirma com:

```bash
curl http://localhost:3000/health
# { "status":"ok", "uptime":1, "version":"0.1.0" }
```

Para apontar a app ao backend local em vez do Supabase directo (quando aplicável),
configura a env `EXPO_PUBLIC_API_URL=http://<ip-do-pc>:3000` em
`ridefriend/.env` e reinicia o Expo.

---

## 8. Comandos úteis

```bash
# App
npm run lint            # type-check sem build
npm test                # Jest unit tests
npm run test:watch      # watch mode

# Backend
npm run dev             # ts-node-dev com reload
npm run build           # compila para dist/
npm start               # corre dist/app.js
npm test                # Jest + supertest
npm run lint            # tsc --noEmit
```

---

## 9. Deploy em produção (resumo)

1. Configura DNS: `api.ridefriend.ao` → IP do VPS Hostinger.
2. No VPS como root: `bash scripts/deploy.sh` (vai pedir o URL do repo).
3. Edita `/etc/ridefriend.env` com as variáveis reais.
4. Adiciona estas secrets ao GitHub repo:
   `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `CALLMEBOT_PHONE`, `CALLMEBOT_API_KEY`.
5. Push para `main` → o workflow `.github/workflows/deploy.yml` faz build,
   SSH `git pull && npm ci && npm run build && pm2 reload`, e notifica por
   WhatsApp via CallMeBot.

---

## 10. Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| `OTP não chega` | Provider não configurado ou número não em sandbox AT/Twilio | Em dev usa OTP fixo do Supabase ou adiciona o número aos sandbox numbers |
| `RLS denied` em queries | Schema RLS exige `auth.uid()` | Confirma que estás autenticado; o seed corre como service_role e ignora RLS |
| `nearby_users RPC missing` | RPCs PostGIS não foram criadas | Cria a função SQL em `Supabase → Database → Functions` (ver TODO no `push.service.ts`) |
| `Permissão de localização negada` no Android | Permissão de background não pedida | Aceita o prompt; em emulador Android Studio define mock location |
| App mostra ecrã branco | Fonts não carregadas / i18n não inicializado | Confirma logs do Expo; reinicia com `--clear` |

---

## 11. Próximos passos

- Lê [`docs/API.md`](API.md) para a referência de endpoints do backend.
- Para contribuir, abre uma PR contra `main` — o workflow CI corre tests/lint/build.
- Para activar push notifications em produção, gera credenciais do Expo
  (`eas credentials`) e adiciona o `projectId` ao `app.json`.
