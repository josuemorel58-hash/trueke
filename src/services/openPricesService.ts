import snapshot from '@/data/precios-abiertos.json';
import { getDatabase } from '@/db/localDatabase';

export type OpenPrice = {
  id: string;
  producto: string;
  tipo: string;
  precio: number;
  mes: string;
  anio: number;
  establecimiento: string;
};

export type OpenDataset = { fuente: string; periodo: string; registros: OpenPrice[] };
type CacheRow = { contenido: string; revisado_at: string };

export const SOURCE_PAGE = 'https://proconsumidor.gob.do/transparencia/index.php/precios-de-productos-de-primera-necesidad-2026.html';
const CSV_URL = 'https://www.proconsumidor.gob.do/files/precios%20de%20productos%20de%20primera%20necesidad.csv';
export const BUNDLED_PRICES: OpenDataset = snapshot;

function periodNumber(data: OpenDataset) {
  const months: Record<string, number> = { Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6, Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12 };
  return Math.max(0, ...data.registros.map((price) => price.anio * 12 + (months[price.mes] ?? 0)));
}

function validDataset(value: unknown): value is OpenDataset {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<OpenDataset>;
  return typeof data.periodo === 'string' && Array.isArray(data.registros) && data.registros.length >= 50 &&
    data.registros.every((row) => row && typeof row.producto === 'string' && typeof row.tipo === 'string' &&
      typeof row.mes === 'string' && typeof row.establecimiento === 'string' &&
      Number.isFinite(row.precio) && row.precio > 0 && Number.isInteger(row.anio));
}

export async function getSavedPrices(): Promise<{ data: OpenDataset; checkedAt: string | null }> {
  const db = await getDatabase();
  const cached = await db.getFirstAsync<CacheRow>('SELECT contenido, revisado_at FROM precios_abiertos_cache WHERE id = 1');
  if (cached) {
    try {
      const parsed: unknown = JSON.parse(cached.contenido);
      if (validDataset(parsed) && periodNumber(parsed) >= periodNumber(BUNDLED_PRICES)) {
        return { data: parsed, checkedAt: cached.revisado_at };
      }
    } catch { /* Si la caché está dañada, usamos la copia incluida. */ }
  }
  return { data: BUNDLED_PRICES, checkedAt: null };
}

export function parsePublishedCsv(content: string): OpenDataset {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.split(';'));
  const title = lines[0]?.[0]?.trim() ?? '';
  const match = title.match(/\b20\d{2}\b/);
  const year = Number(match?.[0]);
  const columns = lines[2]?.slice(0, 7).map((value) => value.trim().toLowerCase());
  if (!year || columns?.join('|') !== 'id|producto|tipo|precio|mes|año|establecimiento') {
    throw new Error('El formato del archivo oficial cambió. Se conservan los precios anteriores.');
  }
  const records: OpenPrice[] = [];
  for (const row of lines.slice(3)) {
    if (!/^\d+$/.test(row[0]?.trim() ?? '')) continue;
    const [id, producto, tipo, amount, mes, itemYear, establecimiento] = row.map((value) => value.trim());
    const precio = Number(amount?.replace(/,/g, ''));
    if (!producto || !tipo || !establecimiento || !mes || Number(itemYear) !== year ||
      !Number.isFinite(precio) || precio <= 0 || precio >= 1000000) continue;
    records.push({ id, producto: producto.replace(/\s+/g, ' '), tipo: tipo.replace(/\s+/g, ' '), precio, mes, anio: year, establecimiento: establecimiento.replace(/\s+/g, ' ') });
  }
  if (records.length < 50) throw new Error('El archivo oficial no contiene suficientes precios válidos.');
  return { fuente: CSV_URL, periodo: title, registros: records };
}

export async function updateOpenPrices(): Promise<{ data: OpenDataset; checkedAt: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(CSV_URL, { signal: controller.signal });
    if (!response.ok) throw new Error(`No se pudo descargar la fuente oficial (${response.status}).`);
    const content = await response.text();
    if (content.length > 2_000_000) throw new Error('El archivo recibido es demasiado grande.');
    const data = parsePublishedCsv(content);
    if (periodNumber(data) < periodNumber(BUNDLED_PRICES)) {
      throw new Error('El archivo remoto es anterior a la copia guardada.');
    }
    const checkedAt = new Date().toISOString();
    const db = await getDatabase();
    await db.runAsync(
      'INSERT OR REPLACE INTO precios_abiertos_cache (id, contenido, revisado_at) VALUES (1, ?, ?)',
      JSON.stringify(data), checkedAt
    );
    return { data, checkedAt };
  } finally {
    clearTimeout(timeout);
  }
}
