import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AuthInput } from '@/components/AuthInput';
import { BrandHeader } from '@/components/BrandHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { updatePassword } from '@/services/authService';

export function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
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
      await updatePassword(password);
      Alert.alert('Contraseña actualizada', 'Tu contraseña fue cambiada correctamente.');
      onDone();
    } catch (error) {
      Alert.alert('No se pudo actualizar', getMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <BrandHeader compact />
      <View style={styles.card}>
        <Text style={styles.heading}>Nueva contraseña</Text>
        <Text style={styles.helper}>Escribe la contraseña que usarás a partir de ahora.</Text>
        <View style={styles.form}>
          <AuthInput
            label="Nueva contraseña"
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
          <PrimaryButton title="GUARDAR CONTRASEÑA" onPress={save} loading={loading} />
        </View>
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
});
