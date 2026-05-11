// Ficheiro: src/utils/__tests__/geo.test.ts | Função: testes de geo (P4 v2.1 — km/min)
import {
  calculateBearing,
  estimateETA,
  formatDistance,
  formatETA,
  getPointAtDistance,
  haversineDistance,
  isPointNearRoute,
} from '../geo';

// Coordenadas de Luanda usadas no spec.
const INGOMBOTA = { lat: -8.8147, lng: 13.2302 };
const TALATONA = { lat: -8.9186, lng: 13.1847 };
const VIANA = { lat: -8.9039, lng: 13.3728 };

describe('haversineDistance (km)', () => {
  it('devolve 0 para coordenadas iguais', () => {
    expect(haversineDistance(INGOMBOTA.lat, INGOMBOTA.lng, INGOMBOTA.lat, INGOMBOTA.lng)).toBe(0);
  });

  it('Ingombota → Talatona ≈ 12-13 km (linha recta)', () => {
    const km = haversineDistance(INGOMBOTA.lat, INGOMBOTA.lng, TALATONA.lat, TALATONA.lng);
    expect(km).toBeGreaterThan(11);
    expect(km).toBeLessThan(14);
  });

  it('é simétrica', () => {
    const a = haversineDistance(INGOMBOTA.lat, INGOMBOTA.lng, VIANA.lat, VIANA.lng);
    const b = haversineDistance(VIANA.lat, VIANA.lng, INGOMBOTA.lat, INGOMBOTA.lng);
    expect(a).toBe(b);
  });

  it('arredonda a 2 casas decimais', () => {
    const km = haversineDistance(INGOMBOTA.lat, INGOMBOTA.lng, VIANA.lat, VIANA.lng);
    expect(km).toBe(Math.round(km * 100) / 100);
  });
});

describe('estimateETA (min, default 30 km/h)', () => {
  it('15 km a 30 km/h = 30 min', () => {
    expect(estimateETA(15)).toBe(30);
  });

  it('respeita velocidade média customizada', () => {
    expect(estimateETA(15, 60)).toBe(15);
  });

  it('arredonda para o minuto mais próximo', () => {
    expect(estimateETA(0.5, 30)).toBe(1); // 1 min
    expect(estimateETA(0.1, 30)).toBe(0); // arredonda para 0 ("Agora!")
  });

  it('devolve 0 quando velocidade é 0', () => {
    expect(estimateETA(10, 0)).toBe(0);
  });
});

describe('formatDistance', () => {
  it('< 1 km mostra metros inteiros', () => {
    expect(formatDistance(0.05)).toBe('50 m');
    expect(formatDistance(0.5)).toBe('500 m');
    expect(formatDistance(0.999)).toBe('999 m');
  });

  it('>= 1 km mostra km com 1 decimal', () => {
    expect(formatDistance(1)).toBe('1.0 km');
    expect(formatDistance(1.234)).toBe('1.2 km');
    expect(formatDistance(18)).toBe('18.0 km');
  });
});

describe('formatETA', () => {
  it('"Agora!" para 0 ou negativo', () => {
    expect(formatETA(0)).toBe('Agora!');
    expect(formatETA(-1)).toBe('Agora!');
  });

  it('"1 min" / "5 min" abaixo de 60', () => {
    expect(formatETA(1)).toBe('1 min');
    expect(formatETA(5)).toBe('5 min');
    expect(formatETA(59)).toBe('59 min');
  });

  it('"1h" / "1h 5m" para >= 60', () => {
    expect(formatETA(60)).toBe('1h');
    expect(formatETA(65)).toBe('1h 5m');
    expect(formatETA(125)).toBe('2h 5m');
  });
});

describe('isPointNearRoute', () => {
  it('detecta ponto perto do segmento', () => {
    // Ponto entre Ingombota e Viana
    const middle = {
      lat: (INGOMBOTA.lat + VIANA.lat) / 2,
      lng: (INGOMBOTA.lng + VIANA.lng) / 2,
    };
    expect(isPointNearRoute(middle, INGOMBOTA, VIANA, 100)).toBe(true);
  });

  it('rejeita ponto longe do segmento', () => {
    const farAway = { lat: -10, lng: 10 };
    expect(isPointNearRoute(farAway, INGOMBOTA, VIANA, 1000)).toBe(false);
  });

  it('quando origem == destino, mede distância directa', () => {
    expect(isPointNearRoute(INGOMBOTA, TALATONA, TALATONA, 50_000)).toBe(true);
    expect(isPointNearRoute(INGOMBOTA, TALATONA, TALATONA, 100)).toBe(false);
  });
});

describe('calculateBearing', () => {
  it('devolve valor entre 0 e 360', () => {
    const b = calculateBearing(INGOMBOTA.lat, INGOMBOTA.lng, VIANA.lat, VIANA.lng);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
});

describe('getPointAtDistance', () => {
  it('produz ponto à distância pedida', () => {
    const target = getPointAtDistance(INGOMBOTA.lat, INGOMBOTA.lng, 1000, 45);
    const measuredKm = haversineDistance(INGOMBOTA.lat, INGOMBOTA.lng, target.lat, target.lng);
    expect(measuredKm).toBeCloseTo(1, 1); // ±0.1 km
  });
});
