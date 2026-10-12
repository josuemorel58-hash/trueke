import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthInput } from '@/components/AuthInput';
import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { requestPasswordReset } from '@/services/authService';

export function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!email.trim()) {
      Alert.alert('Falta el correo', 'Escribe el correo de tu cuenta.');
      return;
    }

    try {
      setLoading(true);
      await requestPasswordReset(email);
      Alert.alert(
        'Correo enviado',
        'Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña.'
      );
      onBack();
    } catch (error) {
      Alert.alert('No se pudo enviar', getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <BrandHeader compact />
      <View style={styles.card}>
        <Text style={styles.heading}>Recuperar contraseña</Text>
        <Text style={styles.helper}>
          Te enviaremos un enlace al correo para crear una contraseña nueva.
        </Text>
        <View style={styles.form}>
          <AuthInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            keyboardType="email-address"
          />
          <PrimaryButton title="ENVIAR CORREO" onPress={send} loading={loading} />
        </View>
        <Pressable onPress={onBack} style={styles.backWrap}>
          <Text style={styles.back}>← Volver</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6FAF5', justifyContent: 'center', padding: 22 },
  card: { backgroundColor: '#FFF', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#E5EDE4' },
  heading: { fontSize: 24, fontWeight: '900', color: '#1D3422' },
  helper: { color: '#718075', marginTop: 7, marginBottom: 22, lineHeight: 20 },
  form: { gap: 16 },
  backWrap: { marginTop: 20, alignItems: 'center' },
  back: { color: '#2F7D45', fontWeight: '700' },
});
