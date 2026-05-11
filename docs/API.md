# RideFriend API — Referência de Endpoints

**Base URL (produção):** `https://api.ridefriend.ao`
**Base URL (dev):**       `http://localhost:3000`

Todas as respostas são JSON. Endpoints autenticados exigem o header:

```
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

Em caso de erro o body segue o formato:

```json
{ "error": "Mensagem em pt-PT", "details": { ... } }
```

Rate limits (Express + Nginx):
- `/auth/*` — **10 req/min** por IP
- restantes — **100 req/min** por IP

---

## Health

### `GET /health` — pública

**200 OK**
```json
{ "status": "ok", "uptime": 1834, "version": "0.1.0" }
```

---

## Autenticação

### `POST /auth/otp`
Pede um código OTP por SMS via Supabase Auth.

**Body**
```json
{ "phone": "+244923000001" }
```

**200**
```json
{ "ok": true }
```

**Erros**
| Status | Quando |
|--------|--------|
| 400 | Número fora do formato E.164 (`^\+\d{8,15}$`) |
| 400 | Supabase rejeita (`invalid_phone`, etc.) |
| 429 | Mais de 10 pedidos no último minuto |

---

### `POST /auth/verify`
Troca um OTP por uma sessão Supabase.

**Body**
```json
{ "phone": "+244923000001", "token": "123456" }
```

**200**
```json
{
  "session": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "expires_at": 1716470400,
    "token_type": "bearer"
  },
  "user": {
    "id": "uuid",
    "phone": "+244923000001"
  }
}
```

**Erros**: `400` (body inválido), `401` (token expirado ou errado).

---

## Utilizadores — requer auth

### `GET /users/me`
Devolve o próprio perfil (todos os campos).

**200**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+244923100001",
    "email": "ana@example.ao",
    "name": "Ana Domingos",
    "photo_url": null,
    "home_area": "Ingombota",
    "is_driver": false,
    "rating_avg": 4.8,
    "ride_count": 12,
    "expo_push_token": "ExponentPushToken[abc]",
    "market_code": "ao",
    "created_at": "2026-02-08T00:00:00Z"
  }
}
```

### `PATCH /users/me`
Actualiza um subconjunto de campos.

**Body (todos opcionais; mínimo 1)**
```json
{
  "name": "Ana Domingos da Silva",
  "email": "ana.silva@example.ao",
  "photo_url": "https://...",
  "home_area": "Ingombota",
  "is_driver": false,
  "expo_push_token": "ExponentPushToken[xyz]"
}
```

**200** — mesmo shape que `GET /users/me`.

**Erros**: `400` (body inválido / vazio), `404`.

### `GET /users/:id`
Perfil público (sem `phone`/`email`). Só responde se o id for o próprio ou um
contacto na rede; caso contrário devolve **404** (para não vazar existência).

---

## Contactos — requer auth

### `GET /contacts`
Lista a rede do utilizador.

**200**
```json
{
  "contacts": [
    {
      "id": "contact-row-uuid",
      "group_type": "friend",
      "created_at": "2026-03-01T10:00:00Z",
      "contact": {
        "id": "user-uuid",
        "name": "Carlos Mateus",
        "photo_url": null,
        "is_driver": true,
        "rating_avg": 4.9
      }
    }
  ]
}
```

### `POST /contacts`
**Body**
```json
{
  "contact_user_id": "uuid",
  "group_type": "family"
}
```
`group_type ∈ {family, friend, colleague, neighbour}` (default `friend`).

**201** — `{ "contact": { ... } }`
**Erros**: `400` (auto-adicionar), `409` (já existe), `404`/`500`.

### `DELETE /contacts/:id`
**204** quando removido. **404** se o id não pertence ao utilizador.

---

## Localizações — requer auth

### `POST /locations/me`
Upsert da localização actual (idempotente por `user_id`).

**Body**
```json
{
  "lat": -8.8147,
  "lng": 13.2302,
  "accuracy": 8,
  "mode": "passenger",
  "is_active": true,
  "heading": 45,
  "speed": 6.4
}
```

**200**
```json
{
  "location": {
    "user_id": "uuid", "lat": -8.8147, "lng": 13.2302,
    "mode": "passenger", "is_active": true, "accuracy": 8,
    "heading": 45, "speed": 6.4,
    "updated_at": "2026-05-09T18:00:00Z"
  }
}
```

### `GET /locations/nearby`
Lista utilizadores activos num raio. Requer RPC PostGIS `nearby_users` no Supabase.

**Query**
```
GET /locations/nearby?lat=-8.81&lng=13.23&radius_km=5&mode=driver
```

| Param | Tipo | Default | Restrição |
|-------|------|---------|-----------|
| `lat` | number | obrigatório | -90..90 |
| `lng` | number | obrigatório | -180..180 |
| `radius_km` | number | 5 | 0..50 |
| `mode` | string | — | `passenger` ou `driver` |

**200** — `{ "users": [ ... ] }` (shape depende da RPC).

---

## Boleias — requer auth

### `GET /rides`
Lista boleias do utilizador (como motorista, passageiro, ou ambos).

**Query**
```
?role=passenger|driver  (opcional)
?status=completed       (opcional)
?limit=20               (1..100, default 20)
```

**200** — `{ "rides": [ ride, ride, ... ] }`

### `POST /rides`
Cria pedido de boleia. O autor (JWT) é sempre o **passageiro**.

**Body**
```json
{
  "driver_id": "uuid",
  "origin_lat": -8.8147,
  "origin_lng": 13.2302,
  "dest_lat": -8.9186,
  "dest_lng": 13.1847,
  "market_code": "ao"
}
```

**201**
```json
{
  "ride": {
    "id": "uuid",
    "driver_id": "uuid",
    "passenger_id": "uuid",
    "status": "requested",
    "origin_lat": -8.8147,
    "origin_lng": 13.2302,
    "dest_lat": -8.9186,
    "dest_lng": 13.1847,
    "market_code": "ao",
    "created_at": "2026-05-09T18:00:00Z"
  }
}
```

Efeito colateral: envia push `ride_request` ao motorista (fire-and-forget).

**Erros**: `400` (auto-pedido, body inválido), `500`.

### `PATCH /rides/:id/status`
Avança o estado da boleia (apenas motorista ou passageiro envolvidos).

**Body**
```json
{ "status": "accepted" }
```

Transições válidas:
- `requested → accepted | cancelled`
- `accepted → in_progress | cancelled`
- `in_progress → completed | cancelled`
- terminais: `completed`, `cancelled`

**200** — `{ "ride": { ... } }`
**Erros**: `403` (não és parte da boleia), `404`, `409` (transição inválida).

---

## Avaliações — requer auth

### `POST /ratings`
Cria avaliação numa boleia concluída.

**Body**
```json
{
  "ride_id": "uuid",
  "rated_id": "uuid",
  "score": 5,
  "comment": "Pontual e simpático"
}
```

**201** — `{ "rating": { ... } }`. Dispara RPC `recalc_user_rating` em background.

**Erros**:
| Status | Quando |
|--------|--------|
| 400 | Body inválido / avaliar a si próprio / avaliado não participou |
| 403 | Não és parte da boleia |
| 404 | Boleia não existe |
| 409 | Boleia não está `completed` |
| 409 | Já avaliaste esta boleia (unique constraint) |

---

## Notificações — requer auth

### `POST /notifications/alert-contacts`
Alerta a rede do utilizador num raio. Idempotente do ponto de vista do servidor.

**Body**
```json
{
  "radius_km": 5,
  "title": "Estou na paragem",
  "body": "Procuro boleia para Talatona",
  "payload": { "stop_name": "Largo do Kinaxixi" }
}
```

**200**
```json
{ "delivered": 3 }
```

---

## SOS — requer auth

### `POST /sos`
Cria registo em `sos_events` + envia push (canal `sos`, high priority) ao
contacto de emergência + SMS de backup via AfricasTalking.

**Body**
```json
{
  "lat": -8.8147,
  "lng": 13.2302,
  "ride_id": "uuid|null",
  "emergency_contact_phone": "+244923100002",
  "emergency_contact_user_id": "uuid|null"
}
```

**201**
```json
{
  "sos_event": {
    "id": "uuid",
    "triggered_at": "2026-05-09T18:00:00Z"
  },
  "delivery": {
    "pushDelivered": true,
    "smsDelivered": true
  }
}
```

`pushDelivered` e `smsDelivered` são "best-effort" — a entrega não falha o
request mesmo que um canal falhe. Cliente deve mostrar feedback baseado nos
flags devolvidos.

**Erros**: `400` (body inválido), `404` (utilizador), `500`.

---

## Códigos HTTP usados

| Código | Significado |
|--------|-------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content (delete) |
| 400 | Validação (zod) ou regra de negócio |
| 401 | Sem token / token expirado |
| 403 | Sem acesso ao recurso |
| 404 | Recurso não existe (ou está oculto por RLS-like check) |
| 409 | Conflito (transição inválida, unique constraint) |
| 429 | Rate limit excedido |
| 500 | Erro interno (logado com contexto no servidor) |

---

## Notas para integradores

- **JWT**: o token é o `access_token` emitido por `supabase.auth.signInWithOtp` /
  `verifyOtp`. Algoritmo HS256, aud `authenticated`. O backend valida apenas a
  assinatura — confia no `sub` como identidade.
- **RLS bypass**: o backend usa `service_role`, por isso cada controller é
  responsável por verificar autorização (ver `users.controller.getById`,
  `rides.controller.updateStatus`).
- **Idempotência**: `POST /locations/me` é idempotente (upsert on `user_id`).
  Os demais POSTs não são — usar `Idempotency-Key` se for adicionado no futuro.
- **Paginação**: actualmente só `/rides` aceita `?limit`. Cursors serão
  introduzidos quando necessário.
