import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BUNDLED_PRICES, getSavedPrices, SOURCE_PAGE, updateOpenPrices } from '@/services/openPricesService';
import type { OpenDataset, OpenPrice } from '@/services/openPricesService';

const C = { green: '#075B38', forest: '#063E2A', lime: '#B8ED45', pale: '#E9F5E7', text: '#1D3327', muted: '#6D7D70', line: '#DFE9DC' };
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
type Group = { key: string; name: string; presentation: string; entries: OpenPrice[] };

function clean(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function periodKey(row: OpenPrice) {
  return `${row.mes} ${row.anio}`;
}

function newestPeriod(data: OpenDataset) {
  return data.registros.reduce((latest, row) => {
    const number = row.anio * 12 + MONTHS.indexOf(row.mes);
    return number > latest.number ? { number, label: periodKey(row) } : latest;
  }, { number: 0, label: '' }).label;
}

function formatMoney(value: number) {
  return `RD$ ${value.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function OpenPricesScreen() {
  const [dataset, setDataset] = useState<OpenDataset>(BUNDLED_PRICES);
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState(() => newestPeriod(BUNDLED_PRICES));
  const [segment, setSegment] = useState('Todos');
  const [visibleCount, setVisibleCount] = useState(40);
  const [checking, setChecking] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  async function refresh(showError: boolean) {
    try {
      setChecking(true);
      const { data, checkedAt: time } = await updateOpenPrices();
      setDataset(data);
      setPeriod((current) => {
        const latest = newestPeriod(data);
        return data.registros.some((row) => periodKey(row) === current) ? current : latest;
      });
      setCheckedAt(time);
    } catch (cause) {
      if (showError) {
        Alert.alert('No se pudo actualizar', `${cause instanceof Error ? cause.message : 'Comprueba tu conexión.'}\nSe siguen mostrando los precios guardados.`);
      }
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    let active = true;
    getSavedPrices().then(({ data, checkedAt: time }) => {
      if (!active) return;
      setDataset(data);
      setPeriod((current) => data.registros.some((row) => periodKey(row) === current) ? current : newestPeriod(data));
      setCheckedAt(time);
      if (!time || Date.now() - Date.parse(time) > 24 * 60 * 60 * 1000) void refresh(false);
    }).catch(() => { if (active) void refresh(false); });
    return () => { active = false; };
  }, []);

  const periods = useMemo(() => Array.from(new Set(dataset.registros.map(periodKey)))
    .sort((a, b) => {
      const [am, ay] = a.split(' '); const [bm, by] = b.split(' ');
      return Number(by) * 12 + MONTHS.indexOf(bm) - Number(ay) * 12 - MONTHS.indexOf(am);
    }), [dataset]);

  const segments = useMemo(() => ['Todos', ...Array.from(new Set(dataset.registros.filter((row) => periodKey(row) === period).map((row) => row.establecimiento)))], [dataset, period]);

  const groups = useMemo(() => {
    const found = new Map<string, Group>();
    for (const row of dataset.registros) {
      if (periodKey(row) !== period || (segment !== 'Todos' && row.establecimiento !== segment)) continue;
      if (query && !clean(`${row.producto} ${row.tipo}`).includes(clean(query))) continue;
      const key = `${clean(row.producto)}|${clean(row.tipo)}`;
      const item = found.get(key) ?? { key, name: row.producto, presentation: row.tipo, entries: [] };
      item.entries.push(row);
      found.set(key, item);
    }
    return Array.from(found.values()).map((item) => ({ ...item, entries: item.entries.sort((a, b) => a.precio - b.precio) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [dataset, period, segment, query]);

  async function openSource() {
    try { await Linking.openURL(SOURCE_PAGE); }
    catch { Alert.alert('No se pudo abrir la fuente', 'Revisa tu conexión.'); }
  }

  return (
    <>
      <View style={styles.heading}>
        <Text style={styles.title}>Precios en RD</Text>
        <Text style={styles.subtitle}>Consulta los productos de primera necesidad publicados por Pro Consumidor.</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>DATOS ABIERTOS · PRO CONSUMIDOR</Text>
        <Text style={styles.heroTitle}>Compara por tipo de comercio</Text>
        <Text style={styles.heroText}>Los precios corresponden al mes del informe seleccionado. No identifican supermercados ni sucursales individuales.</Text>
        <Pressable onPress={openSource} style={styles.sourceButton} accessibilityRole="link"><Text style={styles.sourceText}>Ver publicación oficial ↗</Text></Pressable>
      </View>
      <Text style={styles.caption}>Período disponible: {periods[periods.length - 1]} – {periods[0]} · {dataset.registros.length} registros</Text>
      <View style={styles.filterHeading}>
        <Text style={styles.filterLabel}>Mes del precio</Text>
        <Pressable disabled={checking} onPress={() => void refresh(true)} accessibilityRole="button">
          <Text style={styles.refreshText}>{checking ? 'Actualizando…' : '↻ Actualizar'}</Text>
        </Pressable>
      </View>
      <View style={styles.chipRow}>
        {periods.map((item) => <Pressable key={item} onPress={() => { setPeriod(item); setSegment('Todos'); setVisibleCount(40); }} style={[styles.chip, period === item && styles.chipSelected]} accessibilityRole="button" accessibilityState={{ selected: period === item }}><Text style={[styles.chipText, period === item && styles.chipTextSelected]}>{item}</Text></Pressable>)}
      </View>
      <Text style={styles.filterLabel}>Tipo de comercio</Text>
      <View style={styles.chipRow}>
        {segments.map((item) => <Pressable key={item} onPress={() => { setSegment(item); setVisibleCount(40); }} style={[styles.chip, segment === item && styles.chipSelected]} accessibilityRole="button" accessibilityState={{ selected: segment === item }}><Text style={[styles.chipText, segment === item && styles.chipTextSelected]}>{titleCase(item)}</Text></Pressable>)}
      </View>
      <TextInput value={query} onChangeText={(value) => { setQuery(value); setVisibleCount(40); }} placeholder="Buscar arroz, leche, yuca…" placeholderTextColor="#96A798" style={styles.search} accessibilityLabel="Buscar alimento" />
      <Text style={styles.resultCount}>{groups.length} {groups.length === 1 ? 'producto' : 'productos'} en {period}</Text>
      {groups.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>No hay productos para esta búsqueda</Text><Text style={styles.emptyText}>Prueba otro nombre, mes o tipo de comercio.</Text></View> : null}
      {groups.slice(0, visibleCount).map((item) => (
        <View key={item.key} style={styles.card}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.presentation}>{item.presentation}</Text>
          {item.entries.map((entry) => (
            <View key={entry.id} style={styles.priceLine}>
              <Text style={styles.segmentName}>{titleCase(entry.establecimiento)}</Text>
              <Text style={styles.amount}>{formatMoney(entry.precio)}</Text>
            </View>
          ))}
          {item.entries.length > 1 ? <Text style={styles.lowest}>Menor precio publicado: {titleCase(item.entries[0].establecimiento)}</Text> : null}
        </View>
      ))}
      {groups.length > visibleCount ? <Pressable style={styles.moreButton} onPress={() => setVisibleCount((count) => count + 40)}><Text style={styles.moreText}>Ver más productos</Text></Pressable> : null}
      {checking ? <ActivityIndicator color={C.green} style={styles.loader} /> : null}
      <Text style={styles.disclosure}>Fuente: Pro Consumidor, datos abiertos ODbL. Precios por segmento y período del informe; pueden diferir de los precios actuales en tienda. {checkedAt ? `Archivo revisado: ${new Date(checkedAt).toLocaleDateString('es-DO')}.` : 'Se muestran los datos incluidos en la aplicación.'}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 36, marginBottom: 20 }, title: { color: C.text, fontSize: 29, fontWeight: '900' }, subtitle: { color: C.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  hero: { backgroundColor: C.green, borderRadius: 23, padding: 21 }, heroEyebrow: { color: C.lime, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, heroTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 10 }, heroText: { color: '#DAEFDF', fontSize: 12, lineHeight: 18, marginTop: 8 }, sourceButton: { backgroundColor: C.lime, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, alignSelf: 'flex-start', marginTop: 16 }, sourceText: { color: C.forest, fontWeight: '900', fontSize: 12 },
  caption: { color: C.muted, fontSize: 11, marginTop: 14, marginBottom: 20 }, filterHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, filterLabel: { color: C.text, fontWeight: '900', fontSize: 13, marginBottom: 9 }, refreshText: { color: C.green, fontWeight: '900', fontSize: 12, marginBottom: 9 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }, chip: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18 }, chipSelected: { backgroundColor: C.green, borderColor: C.green }, chipText: { color: C.muted, fontSize: 11, fontWeight: '800' }, chipTextSelected: { color: '#FFFFFF' }, search: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line, borderRadius: 13, paddingHorizontal: 14, minHeight: 49, color: C.text }, resultCount: { fontSize: 12, color: C.muted, marginVertical: 17, fontWeight: '800' },
  empty: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 22, alignItems: 'center' }, emptyTitle: { color: C.text, fontWeight: '900' }, emptyText: { color: C.muted, fontSize: 12, marginTop: 7 }, card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginBottom: 10 }, productName: { color: C.text, fontWeight: '900', fontSize: 15 }, presentation: { color: C.muted, fontSize: 11, marginTop: 3, marginBottom: 10 }, priceLine: { borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', paddingVertical: 9 }, segmentName: { color: C.text, fontSize: 11, flex: 1 }, amount: { color: C.green, fontSize: 13, fontWeight: '900' }, lowest: { color: C.green, backgroundColor: C.pale, padding: 8, overflow: 'hidden', borderRadius: 9, fontSize: 11, fontWeight: '800', marginTop: 6 }, moreButton: { padding: 15, alignItems: 'center', borderRadius: 12, backgroundColor: C.pale }, moreText: { color: C.green, fontWeight: '900', fontSize: 12 }, loader: { marginTop: 15 }, disclosure: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 25 },
});
