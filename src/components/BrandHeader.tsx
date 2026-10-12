import { StyleSheet, Text, View } from 'react-native';

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {!compact ? (
        <Text style={styles.subtitle}>Aprovecha más. Desperdicia menos.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginBottom: 24 },
  compact: { marginBottom: 16 },
  subtitle: { color: '#718075', fontSize: 14 },
});
