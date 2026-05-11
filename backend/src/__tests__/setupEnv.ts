// Ficheiro: backend/src/__tests__/setupEnv.ts | Função: variáveis de ambiente para os testes (P11)
// Corre uma vez antes de qualquer mock — env.ts dispara em import-time.
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.APP_VERSION = 'test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret-with-enough-entropy-aaaaaaaa';
process.env.CORS_ORIGINS = '*';
