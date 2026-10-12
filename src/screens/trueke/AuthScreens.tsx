import { ProfileFields } from "../../components/ProfileFields";
import { emptyProfile, profileError } from "../../data/profile";
import { ReactNode, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStack } from "../../navigation/AppNavigator";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { useAuth } from "../../state/AuthContext";
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  resendConfirmation,
  requestPasswordReset,
  updatePassword,
  signOut,
} from "../../services/authService";
import { authErrorMessage } from "../../services/authRedirect";
import { useTheme } from "../../theme/ThemeContext";
const validEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
function Form({ children }: { children: ReactNode }) {
  const { colors, ui, dark } = useTheme();
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          ui.content,
          { flexGrow: 1, justifyContent: "center" },
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
function Feedback({ error, notice }: { error: string; notice?: string }) {
  const { colors, ui, dark } = useTheme();
  return (
    <>
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
    </>
  );
}
export function LoginScreen({
  navigation,
}: NativeStackScreenProps<RootStack, "Login">) {
  const { colors, ui, dark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function login(google: boolean) {
    if (busy) return;
    setError("");
    setNotice("");
    if (!google && (!validEmail(email) || !password)) {
      setError("Escribe un correo válido y tu contraseña.");
      return;
    }
    setBusy(true);
    try {
      if (google) {
        if (!(await signInWithGoogle()))
          setNotice("Inicio con Google cancelado. Puedes intentarlo de nuevo.");
      } else await signInWithEmail(email, password);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={ui.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={loginStyles.content}
        >
          <View style={loginStyles.header}>
            <Image
              source={require("../../../assets/trueke-icon.png")}
              accessibilityLabel="Logo de Trueke"
              resizeMode="contain"
              style={loginStyles.logo}
            />
            <Text style={[loginStyles.brand, { color: colors.ink }]}>
              Trueke
            </Text>
            <Text style={[ui.muted, loginStyles.center]}>
              Dale otra vida a lo que ya no usas.
            </Text>
          </View>
          <View style={loginStyles.form}>
            <View style={{ gap: 6, marginBottom: 6 }}>
              <Text style={ui.heading}>Qué bueno verte de nuevo</Text>
              <Text style={ui.muted}>
                Entra y encuentra tu próximo intercambio.
              </Text>
            </View>
            <Input
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
            />
            <Input
              label="Contraseña"
              placeholder="Tu contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              returnKeyType="go"
              onSubmitEditing={() => login(false)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => navigation.navigate("Forgot")}
              style={({ pressed }) => [
                loginStyles.link,
                { opacity: pressed || busy ? 0.6 : 1 },
              ]}
            >
              <Text style={{ color: colors.green, fontWeight: "600" }}>
                ¿Olvidaste tu contraseña?
              </Text>
            </Pressable>
            <Feedback error={error} notice={notice} />
            <Button
              title="Iniciar sesión"
              loading={busy}
              onPress={() => login(false)}
            />
            <View style={loginStyles.divider}>
              <View
                style={[loginStyles.line, { backgroundColor: colors.border }]}
              />
              <Text style={ui.muted}>o continúa con</Text>
              <View
                style={[loginStyles.line, { backgroundColor: colors.border }]}
              />
            </View>
            <Button
              title="Continuar con Google"
              secondary
              loading={busy}
              onPress={() => login(true)}
            />
          </View>
          <View style={loginStyles.footer}>
            <Text style={ui.muted}>¿Es tu primera vez aquí?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => navigation.navigate("Register")}
              style={({ pressed }) => [
                loginStyles.register,
                { opacity: pressed || busy ? 0.6 : 1 },
              ]}
            >
              <Text
                style={{ color: colors.green, fontWeight: "700", fontSize: 16 }}
              >
                Crear una cuenta
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const loginStyles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 28,
  },
  header: { alignItems: "center", gap: 8 },
  logo: { width: 88, height: 88, borderRadius: 23, marginBottom: 4 },
  brand: { fontSize: 32, fontWeight: "800", letterSpacing: -0.8 },
  center: { textAlign: "center" },
  form: { gap: 12 },
  link: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 6,
  },
  line: { flex: 1, height: 1 },
  footer: { alignItems: "center", gap: 2 },
  register: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16 },
});

export function RegisterScreen({
  navigation,
}: NativeStackScreenProps<RootStack, "Register">) {
  const { colors, ui, dark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState({ ...emptyProfile });
  const [locating, setLocating] = useState(false);
  async function submit(resend = false) {
    if (busy || locating) return;
    setError("");
    setNotice("");
    if (!validEmail(email)) {
      setError("Escribe un correo válido.");
      return;
    }
    if (!resend && (password.length < 8 || password !== confirm)) {
      setError("Usa al menos 8 caracteres y repite la misma contraseña.");
      return;
    }
    if (!resend && profileError(profile)) {
      setError(profileError(profile));
      return;
    }
    setBusy(true);
    try {
      if (resend) await resendConfirmation(email);
      else await signUpWithEmail(email, password, profile);
      setNotice(
        "Revisa tu correo y la carpeta de spam. Si tu cuenta está pendiente de confirmar, recibirás un enlace. Ábrelo en este teléfono para volver a Trueke.",
      );
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form>
      <Text style={ui.title}>Crear cuenta</Text>
      <Text style={ui.muted}>
        Conozcámonos. Completa tus nombres, apellidos y ciudad para empezar a
        intercambiar.
      </Text>
      <ProfileFields
        value={profile}
        onChange={(change) =>
          setProfile((previous) => ({ ...previous, ...change }))
        }
        disabled={busy}
        onLocating={setLocating}
      />
      <Input
        label="Correo electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        editable={!busy}
      />
      <Input
        label="Contraseña (mínimo 8 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!busy}
      />
      <Input
        label="Confirmar contraseña"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        editable={!busy}
      />
      <Feedback error={error} notice={notice} />
      <Button
        title="Crear cuenta"
        loading={busy || locating}
        onPress={() => submit()}
      />
      <Button
        title="Reenviar correo de confirmación"
        secondary
        loading={busy}
        onPress={() => submit(true)}
      />
      <Button
        title="Volver al inicio de sesión"
        secondary
        loading={busy}
        onPress={() => navigation.goBack()}
      />
    </Form>
  );
}
export function ForgotPasswordScreen({
  navigation,
}: NativeStackScreenProps<RootStack, "Forgot">) {
  const { colors, ui, dark } = useTheme();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  async function send() {
    if (busy) return;
    setError("");
    if (!validEmail(email)) {
      setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form>
      <Text style={ui.title}>
        {sent ? "Revisa tu correo" : "Recupera tu acceso"}
      </Text>
      <Text style={ui.muted}>
        {sent
          ? "Si existe una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña. Revisa spam y ábrelo en este teléfono para volver a la app."
          : "Te enviaremos un enlace para elegir una nueva contraseña."}
      </Text>
      {!sent && (
        <>
          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <Button
            title="Enviar enlace de recuperación"
            loading={busy}
            onPress={send}
          />
        </>
      )}
      <Feedback error={error} />
      <Button
        title="Volver al inicio de sesión"
        secondary
        loading={busy}
        onPress={() => navigation.goBack()}
      />
    </Form>
  );
}
export function ResetPasswordScreen() {
  const { colors, ui, dark } = useTheme();
  const { finishRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    if (busy) return;
    setError("");
    if (password.length < 8 || password !== confirm) {
      setError("Usa al menos 8 caracteres y repite la misma contraseña.");
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      finishRecovery();
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    setBusy(true);
    try {
      await signOut();
      finishRecovery();
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Form>
      <Text style={ui.title}>Nueva contraseña</Text>
      <Text style={ui.muted}>
        Tu enlace fue verificado. Elige una contraseña para tu cuenta.
      </Text>
      <Input
        label="Nueva contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        editable={!busy}
      />
      <Input
        label="Confirmar contraseña"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        editable={!busy}
      />
      <Feedback error={error} />
      <Button title="Guardar contraseña" loading={busy} onPress={save} />
      <Button
        title="Cancelar y cerrar sesión"
        secondary
        loading={busy}
        onPress={cancel}
      />
    </Form>
  );
}
