import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Text,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import type { Session } from "@supabase/supabase-js";
import { supabase, authStorageKey } from "../lib/supabase";
import { consumeAuthUrl, onAuthRedirect } from "../services/authService";
import { authErrorMessage } from "../services/authRedirect";
import { Button } from "../components/Button";
import { useTheme } from "../theme/ThemeContext";
type AuthState = {
  session: Session | null;
  recovery: boolean;
  finishRecovery: () => void;
};
const Context = createContext<AuthState | null>(null);
const recoveryKey = "trueke-password-recovery-user";
// Esta copia solo abre datos locales; Supabase valida el JWT en cada operación remota.
function cachedSession(): Session | null {
  try {
    const saved = JSON.parse(
      globalThis.localStorage.getItem(authStorageKey) || "null",
    );
    return saved?.user?.id && saved?.access_token && saved?.refresh_token
      ? saved
      : null;
  } catch {
    return null;
  }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const { colors, ui, dark } = useTheme();
  const [session, setSession] = useState<Session | null>(cachedSession);
  const sessionRef = useRef<Session | null>(session);
  const [recovery, setRecovery] = useState(false);
  const [ready, setReady] = useState(!!session);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let revision = 0;
    setReady(!!sessionRef.current);
    setError("");
    const redirectCleanup = onAuthRedirect((state) => {
      if (!active) return;
      setProcessing(state.processing);
      // Aplicamos la sesión devuelta por el intercambio, sin depender del orden de eventos.
      if (!state.processing && state.session) {
        revision++;
        sessionRef.current = state.session;
        setSession(state.session);
      }
      if (!state.processing && state.recovery) {
        setRecovery(true);
        // El listener de Supabase ya recibió la sesión verificada.
        if (sessionRef.current)
          globalThis.localStorage.setItem(
            recoveryKey,
            sessionRef.current.user.id,
          );
      }
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, next) => {
        if (!active) return;
        revision++;
        sessionRef.current = next;
        setSession(next);
        if (next) setReady(true);
        if (event === "PASSWORD_RECOVERY" && next) {
          globalThis.localStorage.setItem(recoveryKey, next.user.id);
          setRecovery(true);
        } else if (!next) {
          globalThis.localStorage.removeItem(recoveryKey);
          setRecovery(false);
        } else
          setRecovery(
            globalThis.localStorage.getItem(recoveryKey) === next.user.id,
          );
      },
    );
    async function handle(url: string) {
      try {
        await consumeAuthUrl(url);
      } catch (cause) {
        if (active)
          Alert.alert("No se pudo abrir el enlace", authErrorMessage(cause));
      }
    }
    const links = Linking.addEventListener("url", ({ url }) => {
      void handle(url);
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
    void (async () => {
      const initialRevision = revision;
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!active) return;
      if (revision === initialRevision) {
        sessionRef.current = data.session;
        setSession(data.session);
        setRecovery(
          !!data.session &&
            globalThis.localStorage.getItem(recoveryKey) ===
              data.session.user.id,
        );
      }
      const url = await Linking.getInitialURL();
      if (url) await handle(url);
      if (active) setReady(true);
    })().catch((cause) => {
      if (active) setError(authErrorMessage(cause));
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
      redirectCleanup();
      links.remove();
      appState.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [attempt]);
  if (!ready)
    return (
      <View
        style={[ui.page, { justifyContent: "center", padding: 24, gap: 16 }]}
      >
        {error ? (
          <>
            <Text style={ui.error}>{error}</Text>
            <Button
              title="Reintentar"
              onPress={() => setAttempt((value) => value + 1)}
            />
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text style={ui.muted}>Verificando tu sesión…</Text>
          </>
        )}
      </View>
    );
  return (
    <Context.Provider
      value={{
        session,
        recovery,
        finishRecovery: () => {
          globalThis.localStorage.removeItem(recoveryKey);
          setRecovery(false);
        },
      }}
    >
      {children}
      <Modal
        visible={processing}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View
          style={[
            ui.page,
            { justifyContent: "center", alignItems: "center", gap: 16 },
          ]}
        >
          <ActivityIndicator />
          <Text style={ui.muted}>Verificando el enlace…</Text>
        </View>
      </Modal>
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta AuthProvider");
  return value;
}
