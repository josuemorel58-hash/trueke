import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { listRecentPrices, submitPrice } from '@/services/priceService';
import type { NewPriceReport, PriceReport } from '@/services/priceService';

const SIDIP_URL = 'https://sidip.gob.do/sector/supermercado';
const colors = { green: '#075B38', forest: '#063E2A', lime: '#B8ED45', pale: '#E9F5E7', text: '#1D3327', muted: '#6D7D70', line: '#DFE9DC' };
type Draft = Record<keyof NewPriceReport, string>;
const emptyDraft: Draft = { producto: '', marca: '', presentacion: '', supermercado: '', sucursal: '', ciudad: '', precio_dop: '' };

function normalized(value: string) {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

function money(amount: number) {
  return 'RD$ ' + Number(amount).toFixed(2);
}

type Group = { key: string; title: string; reports: PriceReport[] };

export function PriceComparison({ userId }: { userId: string }) {
  const [reports, setReports] = useState<PriceReport[]>([]);
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  async function reload() {
    try {
      setLoading(true);
      setReports(await listRecentPrices());
      setError(null);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'No se pudieron cargar los precios.';
      setError(message.includes('precios_reportados') || message.includes('schema cache')
        ? 'Falta crear la tabla de precios en Supabase. Ejecuta supabase/precios.sql en SQL Editor.'
        : message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  const groups = useMemo(() => {
    const products = new Map<string, Group>();
    for (const report of reports) {
      if (city && !normalized(report.ciudad).includes(normalized(city))) continue;
      const title = `${report.producto} · ${report.marca} · ${report.presentacion}`;
      if (query && !normalized(title).includes(normalized(query))) continue;
      const key = [report.producto, report.marca, report.presentacion].map(normalized).join('|');
      const group = products.get(key) ?? { key, title, reports: [] };
      const storeKey = [report.supermercado, report.sucursal, report.ciudad].map(normalized).join('|');
      // La consulta trae los aportes más recientes primero: uno por sucursal y producto.
      if (!group.reports.some((item) => [item.supermercado, item.sucursal, item.ciudad].map(normalized).join('|') === storeKey)) {
        group.reports.push(report);
      }
      products.set(key, group);
    }
    return Array.from(products.values())
      .map((group) => ({ ...group, reports: [...group.reports].sort((a, b) => a.precio_dop - b.precio_dop) }))
      .sort((a, b) => a.title.localeCompare(b.title, 'es'));
  }, [reports, query, city]);

  async function openOfficial() {
    await openPage(SIDIP_URL);
  }

  async function openPage(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No se pudo abrir la página', 'Revisa tu conexión e inténtalo de nuevo.');
    }
  }

  async function save() {
    const values = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as Draft;
    const price = Number(values.precio_dop.replace(',', '.'));
    if (Object.values(values).some((value) => !value)) {
      Alert.alert('Faltan datos', 'Escribe producto, marca, presentación, supermercado, sucursal, ciudad y precio.');
      return;
    }
    if (Object.entries(values).some(([key, value]) => key !== 'precio_dop' && value.length > 80)) {
      Alert.alert('Texto demasiado largo', 'Usa nombres de 80 caracteres o menos.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0 || price >= 1000000) {
      Alert.alert('Precio inválido', 'Escribe el precio en pesos dominicanos, por ejemplo 129.95.');
      return;
    }
    try {
      setSaving(true);
      await submitPrice(userId, { ...values, precio_dop: price });
      setModal(false);
      setDraft(emptyDraft);
      await reload();
    } catch (cause) {
      Alert.alert('No se pudo publicar', cause instanceof Error ? cause.message : 'Inténtalo nuevamente.');
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof Draft; label: string; hint: string }[] = [
    { key: 'producto', label: 'Producto', hint: 'Ej. Leche entera' },
    { key: 'marca', label: 'Marca', hint: 'Ej. Rica' },
    { key: 'presentacion', label: 'Presentación', hint: 'Ej. 1 litro' },
    { key: 'supermercado', label: 'Supermercado', hint: 'Ej. Nacional' },
    { key: 'sucursal', label: 'Sucursal', hint: 'Ej. Arroyo Hondo' },
    { key: 'ciudad', label: 'Ciudad', hint: 'Ej. Santo Domingo' },
    { key: 'precio_dop', label: 'Precio (RD$)', hint: 'Ej. 129.95' },
  ];

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Compara precios</Text>
        <Text style={styles.subtitle}>Encuentra el mejor precio reportado para el mismo producto, marca y tamaño.</Text>
      </View>
      <View style={styles.officialCard}>
        <Text style={styles.officialTitle}>Consulta la fuente oficial</Text>
        <Text style={styles.officialText}>SIDIP de Pro Consumidor permite explorar precios de comercios en RD.</Text>
        <Pressable onPress={openOfficial} style={styles.officialButton} accessibilityRole="link">
          <Text style={styles.officialButtonText}>Abrir SIDIP ↗</Text>
        </Pressable>
      </View>
      <Text style={styles.catalogTitle}>Catálogos de supermercados</Text>
      <View style={styles.catalogRow}>
        <Pressable onPress={() => openPage('https://jumbo.com.do/supermercado')} style={styles.catalogButton} accessibilityRole="link"><Text style={styles.catalogButtonText}>Jumbo ↗</Text></Pressable>
        <Pressable onPress={() => openPage('https://supermercadosnacional.com/')} style={styles.catalogButton} accessibilityRole="link"><Text style={styles.catalogButtonText}>Nacional ↗</Text></Pressable>
      </View>

      <TextInput value={query} onChangeText={setQuery} placeholder="Buscar producto o marca" placeholderTextColor="#94A598" style={styles.search} accessibilityLabel="Buscar producto o marca" />
      <TextInput value={city} onChangeText={setCity} placeholder="Filtrar por ciudad (opcional)" placeholderTextColor="#94A598" style={styles.search} accessibilityLabel="Filtrar precios por ciudad" />
      <Pressable onPress={() => setModal(true)} style={styles.addButton} accessibilityRole="button">
        <Text style={styles.addButtonText}>＋ Compartir un precio</Text>
      </Pressable>

      <Text style={styles.notice}>Precios aportados por usuarios durante los últimos 30 días. Confirma el precio en la tienda antes de comprar.</Text>
      {loading ? <ActivityIndicator color={colors.green} style={styles.loader} /> : null}
      {error ? <Pressable onPress={reload} style={styles.empty}><Text style={styles.emptyText}>{error}{'\n'}Toca para reintentar.</Text></Pressable> : null}
      {!loading && !error && groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Todavía no hay precios para esta búsqueda</Text>
          <Text style={styles.emptyText}>Comparte un precio o consulta SIDIP para ver los precios publicados por Pro Consumidor.</Text>
        </View>
      ) : null}
      {!loading && !error ? groups.slice(0, 50).map((group) => {
        const lowest = group.reports[0];
        const isOpen = expanded === group.key;
        return (
          <View key={group.key} style={styles.productCard}>
            <Pressable onPress={() => setExpanded(isOpen ? null : group.key)} accessibilityRole="button" accessibilityLabel={`Comparar ${group.title}`}>
              <Text style={styles.productName}>{group.title}</Text>
              <Text style={styles.lowPrice}>{money(lowest.precio_dop)}</Text>
              <Text style={styles.storeName}>{lowest.supermercado} · {lowest.sucursal}, {lowest.ciudad}</Text>
              <Text style={styles.compareLink}>{group.reports.length > 1 ? `Comparar ${group.reports.length} sucursales` : 'Ver precio reportado'} {isOpen ? '↑' : '↓'}</Text>
            </Pressable>
            {isOpen ? group.reports.map((report) => (
              <View key={report.id} style={styles.priceRow}>
                <View style={styles.storeInfo}>
                  <Text style={styles.rowStore}>{report.supermercado} · {report.sucursal}</Text>
                  <Text style={styles.rowMeta}>{report.ciudad} · {new Date(report.reportado_at).toLocaleDateString('es-DO')}</Text>
                </View>
                <Text style={styles.rowPrice}>{money(report.precio_dop)}</Text>
              </View>
            )) : null}
          </View>
        );
      }) : null}
      {!loading && groups.length > 50 ? <Text style={styles.notice}>Se muestran los primeros 50 productos. Escribe un nombre para encontrar otro.</Text> : null}
      {!loading && reports.length >= 1000 ? <Text style={styles.notice}>Se muestran los 1,000 reportes más recientes. Ajusta el filtro por ciudad.</Text> : null}

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Compartir un precio</Text>
              <Text style={styles.sheetHint}>Escribe exactamente lo que viste en la tienda. Otros usuarios podrán consultarlo.</Text>
              {fields.map(({ key, label, hint }) => (
                <View key={key}>
                  <Text style={styles.inputLabel}>{label}</Text>
                  <TextInput
                    value={draft[key]}
                    onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                    placeholder={hint}
                    placeholderTextColor="#94A598"
                    style={styles.input}
                    keyboardType={key === 'precio_dop' ? 'decimal-pad' : 'default'}
                    maxLength={key === 'producto' ? 100 : 80}
                  />
                </View>
              ))}
              <Pressable onPress={save} disabled={saving} style={styles.saveButton}>
                {saving ? <ActivityIndicator color={colors.forest} /> : <Text style={styles.saveText}>Publicar precio</Text>}
              </Pressable>
              <Pressable onPress={() => setModal(false)} disabled={saving} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 36, marginBottom: 20 },
  title: { color: colors.text, fontWeight: '900', fontSize: 28 },
  subtitle: { color: colors.muted, marginTop: 6, fontSize: 13, lineHeight: 19 },
  officialCard: { backgroundColor: colors.green, borderRadius: 21, padding: 20, marginBottom: 19 },
  officialTitle: { color: colors.lime, fontWeight: '900', fontSize: 16 },
  officialText: { color: '#E2F3E4', marginTop: 7, fontSize: 12, lineHeight: 18 },
  officialButton: { alignSelf: 'flex-start', padding: 11, backgroundColor: colors.lime, borderRadius: 10, marginTop: 15 },
  officialButtonText: { color: colors.forest, fontWeight: '900' },
  catalogTitle: { fontSize: 13, fontWeight: '900', color: colors.text, marginBottom: 10 },
  catalogRow: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  catalogButton: { flex: 1, backgroundColor: '#FFFFFF', borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  catalogButtonText: { color: colors.green, fontWeight: '900', fontSize: 12 },
  search: { backgroundColor: '#FFFFFF', borderColor: colors.line, borderWidth: 1, minHeight: 49, borderRadius: 13, paddingHorizontal: 14, marginBottom: 10, color: colors.text },
  addButton: { backgroundColor: colors.pale, borderColor: '#B8D6BE', borderWidth: 1, borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 3 },
  addButtonText: { fontWeight: '900', color: colors.green },
  notice: { color: colors.muted, lineHeight: 18, fontSize: 11, marginVertical: 17 },
  loader: { marginTop: 25 },
  empty: { padding: 25, borderRadius: 18, backgroundColor: '#FFFFFF', borderColor: colors.line, borderWidth: 1 },
  emptyTitle: { color: colors.text, fontWeight: '900', fontSize: 15, textAlign: 'center' },
  emptyText: { color: colors.muted, lineHeight: 20, fontSize: 12, textAlign: 'center', marginTop: 7 },
  productCard: { borderColor: colors.line, borderWidth: 1, borderRadius: 17, backgroundColor: '#FFFFFF', padding: 16, marginBottom: 11 },
  productName: { color: colors.text, fontWeight: '900', fontSize: 15 },
  lowPrice: { color: colors.green, fontWeight: '900', fontSize: 22, marginTop: 7 },
  storeName: { color: colors.muted, marginTop: 3, fontSize: 12 },
  compareLink: { color: colors.green, fontWeight: '800', fontSize: 12, marginTop: 12 },
  priceRow: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 12, paddingTop: 12, flexDirection: 'row', gap: 9, justifyContent: 'space-between' },
  storeInfo: { flex: 1 },
  rowStore: { color: colors.text, fontWeight: '800', fontSize: 12 },
  rowMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  rowPrice: { color: colors.green, fontWeight: '900', fontSize: 13 },
  backdrop: { flex: 1, backgroundColor: 'rgba(8,38,24,0.55)', justifyContent: 'flex-end' },
  modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: { padding: 24, paddingBottom: 35, backgroundColor: '#F5F8F1', borderTopLeftRadius: 27, borderTopRightRadius: 27 },
  sheetTitle: { fontSize: 23, color: colors.text, fontWeight: '900' },
  sheetHint: { color: colors.muted, fontSize: 12, marginTop: 4 },
  inputLabel: { marginTop: 15, marginBottom: 6, fontSize: 12, color: colors.text, fontWeight: '800' },
  input: { minHeight: 47, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.line, color: colors.text },
  saveButton: { backgroundColor: colors.lime, alignItems: 'center', padding: 15, borderRadius: 13, marginTop: 25 },
  saveText: { color: colors.forest, fontWeight: '900' },
  cancelButton: { alignItems: 'center', padding: 14 },
  cancelText: { color: colors.muted, fontWeight: '800' },
});
