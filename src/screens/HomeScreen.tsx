import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { PrimaryButton } from '@/components/PrimaryButton';
import { signOut } from '@/services/authService';

export function HomeScreen({ session }: { session: Session }) {
  const [loading, setLoading] = useState(false);

  async function logout() {
    try {
      setLoading(true);
      await signOut();
    } catch (error) {
      Alert.alert(
        'No se pudo cerrar sesión',
        error instanceof Error ? error.message : 'Inténtalo de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.checkCircle}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.title} accessibilityRole="header">¡Inicio de sesión exitoso!</Text>
        <Text style={styles.message}>Entraste correctamente a tu cuenta.</Text>
        {session.user.email ? <Text style={styles.email}>{session.user.email}</Text> : null}
        <PrimaryButton title="CERRAR SESIÓN" onPress={logout} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 22, backgroundColor: '#F6FAF5' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E5EDE4' },
  checkCircle: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F4E8', marginBottom: 22 },
  check: { color: '#2F7D45', fontSize: 40, fontWeight: '800' },
  title: { color: '#1D3422', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  message: { color: '#718075', textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 20 },
  email: { color: '#2F7D45', fontSize: 16, textAlign: 'center', marginBottom: 24 },
});
