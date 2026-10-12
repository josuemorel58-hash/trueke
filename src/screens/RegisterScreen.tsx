import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthInput } from '@/components/AuthInput';
import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { signUpWithEmail } from '@/services/authService';

export function RegisterScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function register() {
    if (!email.trim() || !password || !confirm) {
      Alert.alert('Faltan datos', 'Completa todos los campos.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Contraseña débil', 'Usa al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Revisa la contraseña', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const data = await signUpWithEmail(email, password);
      if (data.session) {
        Alert.alert('Cuenta creada', 'Tu sesión ya está activa.');
      } else {
        Alert.alert(
          'Revisa tu correo',
          'Te enviamos un mensaje para confirmar tu cuenta. Después podrás iniciar sesión.'
        );
        onBack();
      }
    } catch (error) {
      Alert.alert('No se pudo crear la cuenta', getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <BrandHeader compact />
        <View style={styles.card}>
          <Text style={styles.heading}>Crear cuenta</Text>
          <Text style={styles.helper}>Tu cuenta permite respaldar y sincronizar tus datos.</Text>
          <View style={styles.form}>
            <AuthInput
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              keyboardType="email-address"
            />
            <AuthInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
            />
            <AuthInput
              label="Confirmar contraseña"
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Repite la contraseña"
              secureTextEntry
            />
            <PrimaryButton title="CREAR CUENTA" onPress={register} loading={loading} />
          </View>
          <Pressable onPress={onBack} style={styles.backWrap}>
            <Text style={styles.back}>← Volver al inicio de sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F6FAF5' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingVertical: 42 },
  card: { backgroundColor: '#FFF', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#E5EDE4' },
  heading: { fontSize: 24, fontWeight: '900', color: '#1D3422' },
  helper: { color: '#718075', marginTop: 5, marginBottom: 22, lineHeight: 20 },
  form: { gap: 15 },
  backWrap: { marginTop: 20, alignItems: 'center' },
  back: { color: '#2F7D45', fontWeight: '700' },
});
