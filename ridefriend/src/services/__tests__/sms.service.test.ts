// Ficheiro: src/services/__tests__/sms.service.test.ts | Função: testes do dispatcher PL3
import {
  buildOtpMessage,
  sendAfricasTalking,
  sendTermii,
  sendTwilio,
  sendOtpSms,
  sendSms,
} from '../sms.service';

// Mock do marketStore para sendOtpSms isolar config sem inicializar i18n.
jest.mock('@store/marketStore', () => ({
  useMarketStore: {
    getState: jest.fn(),
  },
}));

import { useMarketStore } from '@store/marketStore';

const mockedGetState = useMarketStore.getState as jest.Mock;

const aoConfig = { code: 'ao', locale: 'pt-AO', smsProvider: 'africas_talking' };
const brConfig = { code: 'br', locale: 'pt-BR', smsProvider: 'twilio' };
const ngConfig = { code: 'ng', locale: 'en-NG', smsProvider: 'termii' };
const ptConfig = { code: 'pt', locale: 'pt-PT', smsProvider: 'twilio' };

const okResponse = () =>
  Promise.resolve(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

beforeEach(() => {
  jest.resetAllMocks();
  // Variantes sem prefixo EXPO_PUBLIC_ — sms.service.readEnv() faz fallback para estas
  // em runtime, contornando o inline que babel-preset-expo aplica às EXPO_PUBLIC_*.
  process.env.AFRICAS_TALKING_API_KEY = 'at-key';
  process.env.AFRICAS_TALKING_USERNAME = 'at-user';
  process.env.TWILIO_ACCOUNT_SID = 'AC123';
  process.env.TWILIO_AUTH_TOKEN = 'twilio-token';
  process.env.TWILIO_FROM_NUMBER = '+15555550100';
  process.env.TERMII_API_KEY = 'termii-key';
  global.fetch = jest.fn(okResponse) as unknown as typeof fetch;
});

describe('buildOtpMessage', () => {
  it('formata mensagem em pt-AO com o código', () => {
    expect(buildOtpMessage('1234', 'pt-AO')).toBe('O teu código RideFriend é: 1234. Válido 10 min.');
  });

  it('usa "Seu" para pt-BR (não "O teu")', () => {
    const msg = buildOtpMessage('5678', 'pt-BR');
    expect(msg).toContain('Seu código');
    expect(msg).not.toContain('O teu');
    expect(msg).toContain('5678');
  });

  it('formata em inglês para en-NG', () => {
    expect(buildOtpMessage('9012', 'en-NG')).toBe('Your RideFriend code is: 9012. Valid for 10 minutes.');
  });

  it('mantém pt-PT como mensagem partilhada com pt-AO', () => {
    expect(buildOtpMessage('4321', 'pt-PT')).toBe('O teu código RideFriend é: 4321. Válido 10 min.');
  });
});

describe('sendAfricasTalking', () => {
  it('faz POST com headers e body correctos', async () => {
    await sendAfricasTalking('+244923000001', 'msg');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.africastalking.com/version1/messaging');
    expect(options.method).toBe('POST');
    expect(options.headers.apiKey).toBe('at-key');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    expect(options.body).toContain('username=at-user');
    expect(options.body).toContain('to=%2B244923000001');
    expect(options.body).toContain('message=msg');
  });

  it('lança quando o provider não está configurado', async () => {
    delete process.env.AFRICAS_TALKING_API_KEY;
    delete process.env.EXPO_PUBLIC_AFRICAS_TALKING_API_KEY;
    await expect(sendAfricasTalking('+244923000001', 'msg')).rejects.toThrow(/não configurado/);
  });

  it('propaga erro HTTP', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(new Response('bad creds', { status: 401 }));
    await expect(sendAfricasTalking('+244923000001', 'msg')).rejects.toThrow(/401/);
  });
});

describe('sendTwilio', () => {
  it('usa Basic auth com SID:TOKEN em base64 e endpoint do SID', async () => {
    await sendTwilio('+5511999000001', 'oi');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json');
    const expected = Buffer.from('AC123:twilio-token').toString('base64');
    expect(options.headers.Authorization).toBe(`Basic ${expected}`);
    expect(options.body).toContain('From=%2B15555550100');
    expect(options.body).toContain('To=%2B5511999000001');
    expect(options.body).toContain('Body=oi');
  });
});

describe('sendTermii', () => {
  it('faz POST JSON com api_key e from RideFriend', async () => {
    await sendTermii('+2348012345678', 'hi');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://api.ng.termii.com/api/sms/send');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body.api_key).toBe('termii-key');
    expect(body.from).toBe('RideFriend');
    expect(body.sms).toBe('hi');
    expect(body.type).toBe('plain');
    expect(body.to).toBe('+2348012345678');
  });
});

describe('sendSms (dispatcher por provider)', () => {
  it('rota para Africa\'s Talking', async () => {
    await sendSms('+244923000001', 'm', 'africas_talking');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('africastalking.com');
  });

  it('rota para Twilio', async () => {
    await sendSms('+5511999000001', 'm', 'twilio');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('twilio.com');
  });

  it('rota para Termii', async () => {
    await sendSms('+2348012345678', 'm', 'termii');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('termii.com');
  });

  it('rejeita provider desconhecido', async () => {
    await expect(sendSms('+1', 'm', 'unknown' as any)).rejects.toThrow(/não suportado/);
  });
});

describe('sendOtpSms (entry point principal)', () => {
  it('mercado AO → AfricasTalking + mensagem pt-AO', async () => {
    mockedGetState.mockReturnValue({ config: aoConfig });
    await sendOtpSms('+244923000001', '1234');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('africastalking.com');
    expect(decodeURIComponent(options.body.replace(/\+/g, ' '))).toContain('O teu código RideFriend é: 1234');
  });

  it('mercado BR → Twilio + mensagem pt-BR', async () => {
    mockedGetState.mockReturnValue({ config: brConfig });
    await sendOtpSms('+5511999000001', '5678');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('twilio.com');
    expect(decodeURIComponent(options.body.replace(/\+/g, ' '))).toContain('Seu código RideFriend é: 5678');
  });

  it('mercado NG → Termii + mensagem en-NG', async () => {
    mockedGetState.mockReturnValue({ config: ngConfig });
    await sendOtpSms('+2348012345678', '9012');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('termii.com');
    expect(JSON.parse(options.body).sms).toContain('Your RideFriend code is: 9012');
  });

  it('mercado PT → Twilio + mensagem pt-AO/PT (mesma string)', async () => {
    mockedGetState.mockReturnValue({ config: ptConfig });
    await sendOtpSms('+351912000001', '4321');

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(decodeURIComponent(options.body.replace(/\+/g, ' '))).toContain('O teu código RideFriend é: 4321');
  });

  it('lança se não houver mercado seleccionado', async () => {
    mockedGetState.mockReturnValue({ config: null });
    await expect(sendOtpSms('+1', '1234')).rejects.toThrow(/Selecção de mercado/);
  });
});
