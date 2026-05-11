// Ficheiro: jest.setup.ts | Função: env de teste para jest-expo (P11)
// jest-expo (via babel-preset-expo) faz inline das EXPO_PUBLIC_* em build time.
// Definir as variáveis aqui (antes do babel transform) garante que os módulos
// que lêem process.env.EXPO_PUBLIC_X recebem valores válidos durante os testes.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.EXPO_PUBLIC_AFRICAS_TALKING_API_KEY = 'at-key';
process.env.EXPO_PUBLIC_AFRICAS_TALKING_USERNAME = 'at-user';
process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID = 'AC123';
process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN = 'twilio-token';
process.env.EXPO_PUBLIC_TWILIO_FROM_NUMBER = '+15555550100';
process.env.EXPO_PUBLIC_TERMII_API_KEY = 'termii-key';
