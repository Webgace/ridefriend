// Ficheiro: src/hooks/useBanners.ts | Função: lista banners activos para o mercado actual
// RLS no servidor já filtra por janela activa (starts_at/ends_at) e is_active=true.
// Aqui aplicamos o filtro adicional por mercado (NULL = global) + ordenação por priority.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@services/supabase';
import { useMarketStore } from '@store/marketStore';

export interface Banner {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  marketCode: string | null;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RawBanner {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  market_code: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(r: RawBanner): Banner {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    imageUrl: r.image_url,
    ctaLabel: r.cta_label,
    ctaUrl: r.cta_url,
    marketCode: r.market_code,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    priority: r.priority,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

interface UseBannersOptions {
  /** Se true, devolve TODOS os banners (mesmo inactivos / fora de janela) — usar só no admin. */
  includeInactive?: boolean;
}

export function useBanners(options: UseBannersOptions = {}) {
  const { includeInactive = false } = options;
  const marketCode = useMarketStore((s) => s.config?.code ?? null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('banners')
        .select(
          'id, title, body, image_url, cta_label, cta_url, market_code, starts_at, ends_at, priority, is_active, created_at, updated_at',
        )
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      // RLS já filtra activa+janela para não-admins. Para admin (includeInactive),
      // o SELECT devolve tudo.
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      const all = ((data ?? []) as RawBanner[]).map(mapRow);
      const visible = includeInactive
        ? all
        : all.filter((b) => b.marketCode === null || b.marketCode === marketCode);
      setBanners(visible);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao carregar banners.');
    } finally {
      setIsLoading(false);
    }
  }, [includeInactive, marketCode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { banners, isLoading, error, refresh };
}
