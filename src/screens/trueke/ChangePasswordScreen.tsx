import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStack } from "../../navigation/AppNavigator";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useTheme } from "../../theme/ThemeContext";
import {
  updatePassword,
  requestPasswordVerification,
} from "../../services/authService";
import { authErrorMessage } from "../../services/authRedirect";

export function ChangePasswordScreen({
  navigation,
}: NativeStackScreenProps<RootStack, "ChangePassword">) {
  const { ui } = useTheme();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nonce, setNonce] = useState("");
  const [verification, setVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  async function sendCode() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestPasswordVerification();
      setNonce("");
      setNotice("Revisa el código enviado a tu correo o teléfono verificado.");
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (busy) return;
    setError("");
    setNotice("");
    if (password.length < 8 || password !== confirm) {
      setError("Usa al menos 8 caracteres y repite la misma contraseña.");
      return;
    }
    if (verification && !nonce.trim()) {
      setError("Solicita e introduce el código de verificación.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password, verification ? nonce : undefined);
      setPassword("");
      setConfirm("");
      setNonce("");
      setSaved(true);
    } catch (cause) {
      const code = (cause as { code?: string })?.code;
      if (
        code === "reauthentication_needed" ||
        code === "reauthentication_not_valid"
      ) {
        setVerification(true);
        setError(
          "Verifica tu identidad con un código antes de guardar la contraseña.",
        );
      } else setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.content}
      >
        <Text style={ui.title}>
          {saved ? "Contraseña actualizada" : "Cambiar contraseña"}
        </Text>
        {saved ? (
          <Text accessibilityLiveRegion="polite" style={ui.text}>
            Ya puedes usar tu nueva contraseña para iniciar sesión.
          </Text>
        ) : (
          <>
            <Text style={ui.muted}>
              Elige una contraseña nueva para tu cuenta de Trueke. Si entras con
              Google, esto no cambia tu contraseña de Google.
            </Text>
            <Input
              label="Nueva contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <Input
              label="Confirmar nueva contraseña"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            {verification && (
              <>
                <Button
                  title="Enviar código de verificación"
                  secondary
                  loading={busy}
                  onPress={sendCode}
                />
                <Input
                  label="Código de verificación"
                  value={nonce}
                  onChangeText={setNonce}
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                />
              </>
            )}
            {error ? (
              <Text accessibilityLiveRegion="polite" style={ui.error}>
                {error}
              </Text>
            ) : null}
            {notice ? (
              <Text accessibilityLiveRegion="polite" style={ui.text}>
                {notice}
              </Text>
            ) : null}
            <Button title="Guardar contraseña" loading={busy} onPress={save} />
          </>
        )}
        <Button
          title="Volver a mi perfil"
          secondary
          loading={busy}
          onPress={() => navigation.goBack()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
