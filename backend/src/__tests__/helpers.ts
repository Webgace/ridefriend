// Ficheiro: backend/src/__tests__/helpers.ts | Função: utilitários partilhados pelos testes de integração (P11)
import { SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

/**
 * signTestJwt — emite um JWT HS256 compatível com o middleware requireAuth.
 */
export async function signTestJwt(payload: {
  sub: string;
  phone?: string;
  email?: string;
}): Promise<string> {
  return new SignJWT({ phone: payload.phone, email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/**
 * authHeader — wrapper conveniente para os testes supertest.
 */
export async function authHeader(userId: string): Promise<Record<string, string>> {
  const token = await signTestJwt({ sub: userId });
  return { authorization: `Bearer ${token}` };
}

/**
 * makeChainableBuilder — cria um stub do builder Supabase que se pode encadear
 * (.select().eq().single()...). O `terminal` é o valor final devolvido.
 *
 * Útil para evitar boilerplate em cada teste.
 */
export function makeChainableBuilder<T>(terminal: T) {
  const builder: Record<string, jest.Mock> & { __resolves: T } = {
    __resolves: terminal,
  } as Record<string, jest.Mock> & { __resolves: T };

  const chain = [
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'in',
    'or',
    'order',
    'limit',
    'upsert',
  ];

  for (const m of chain) {
    builder[m] = jest.fn(() => builder);
  }
  builder.maybeSingle = jest.fn(async () => terminal);
  builder.single = jest.fn(async () => terminal);
  // Permite `await builder` no final da cadeia (.eq().eq() etc. devolve o builder e o caller
  // faz `const { data, error } = await builder`).
  (builder as unknown as { then: unknown }).then = (resolve: (v: T) => unknown) =>
    Promise.resolve(terminal).then(resolve);

  return builder;
}
