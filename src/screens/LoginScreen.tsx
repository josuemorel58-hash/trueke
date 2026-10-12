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
import { signInWithEmail, signInWithGoogle } from '@/services/authService';

export function LoginScreen({
  onRegister,
  onForgot,
}: {
  onRegister: () => void;
  onForgot: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function login() {
    if (!email.trim() || !password) {
      Alert.alert('Faltan datos', 'Escribe tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmail(email, password);
    } catch (error) {
      Alert.alert('No se pudo iniciar sesión', getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    try {
      setGoogleLoading(true);
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Google', getMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader />

        <View style={styles.card}>
          <Text style={styles.heading}>Bienvenido</Text>
          <Text style={styles.helper}>Inicia sesión con tu correo y contraseña.</Text>

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
              placeholder="Tu contraseña"
              secureTextEntry
            />

            <Pressable onPress={onForgot} hitSlop={8}>
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            <PrimaryButton title="INICIAR SESIÓN" onPress={login} loading={loading} />

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.or}>o</Text>
              <View style={styles.line} />
            </View>

            <PrimaryButton
              title="G   Continuar con Google"
              onPress={google}
              loading={googleLoading}
              variant="outline"
            />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>¿No tienes una cuenta? </Text>
            <Pressable onPress={onRegister}>
              <Text style={styles.signupLink}>Regístrate</Text>
            </Pressable>
          </View>
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 22, paddingVertical: 46 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E5EDE4',
  },
  heading: { fontSize: 24, fontWeight: '900', color: '#1D3422' },
  helper: { color: '#718075', marginTop: 5, marginBottom: 22, lineHeight: 20 },
  form: { gap: 15 },
  forgot: { alignSelf: 'flex-end', color: '#2F7D45', fontWeight: '700', fontSize: 13 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: '#E3E8E3' },
  or: { color: '#8A958C', fontSize: 13 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  signupText: { color: '#738078' },
  signupLink: { color: '#2F7D45', fontWeight: '800' },
});
