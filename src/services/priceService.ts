import { supabase } from '@/lib/supabase';

export type PriceReport = {
  id: string;
  producto: string;
  marca: string;
  presentacion: string;
  supermercado: string;
  sucursal: string;
  ciudad: string;
  precio_dop: number;
  reportado_at: string;
};

export type NewPriceReport = Omit<PriceReport, 'id' | 'reportado_at'>;

const COLUMNS = 'id, producto, marca, presentacion, supermercado, sucursal, ciudad, precio_dop, reportado_at';

export async function listRecentPrices(): Promise<PriceReport[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('precios_reportados')
    .select(COLUMNS)
    .gte('reportado_at', since)
    .order('reportado_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as PriceReport[];
}

export async function submitPrice(userId: string, report: NewPriceReport): Promise<void> {
  const { error } = await supabase.from('precios_reportados').insert({ ...report, user_id: userId });
  if (error) throw error;
}
