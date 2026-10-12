import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../data/trueke";
import { profileError, profileMetadata } from "../data/profile";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { parseAuthRedirect } from "./authRedirect";
WebBrowser.maybeCompleteAuthSession();
function assertConfigured() {
  if (!isSupabaseConfigured)
    throw new Error(
      "Falta configurar la URL y la clave pública de Supabase en .env.",
    );
}
export function getRedirectUrl(path = "auth/callback") {
  return `refrigerio://${path}`;
}
function assertInstalledApp() {
  if (Constants.appOwnership === "expo")
    throw new Error(
      "Para abrir enlaces de correo o Google instala el APK de Trueke o un Development Build. Expo Go no registra refrigerio://.",
    );
}
export async function signInWithEmail(email: string, password: string) {
  assertConfigured();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
}
export async function signUpWithEmail(
  email: string,
  password: string,
  profile?: Profile,
) {
  assertConfigured();
  assertInstalledApp();
  if (profile && profileError(profile)) throw new Error(profileError(profile));
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: getRedirectUrl(),
      ...(profile ? { data: profileMetadata(profile) } : {}),
    },
  });
  if (error) throw error;
  return data;
}
export async function resendConfirmation(email: string) {
  assertConfigured();
  assertInstalledApp();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: getRedirectUrl() },
  });
  if (error) throw error;
}
export async function updateAccountProfile(profile: Profile) {
  assertConfigured();
  const validation = profileError(profile);
  if (validation) throw new Error(validation);
  const { error } = await supabase.auth.updateUser({
    data: profileMetadata(profile),
  });
  if (error) throw error;
}
export async function requestPasswordReset(email: string) {
  assertConfigured();
  assertInstalledApp();
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: getRedirectUrl("auth/reset") },
  );
  if (error) throw error;
}
export async function updatePassword(password: string, nonce?: string) {
  assertConfigured();
  const { data, error } = await supabase.auth.updateUser({
    password,
    ...(nonce?.trim() ? { nonce: nonce.trim() } : {}),
  });
  if (error) throw error;
  return data;
}
export async function requestPasswordVerification() {
  assertConfigured();
  const { error } = await supabase.auth.reauthenticate();
  if (error) throw error;
}
type RedirectState = {
  processing: boolean;
  recovery: boolean;
  session?: Session;
};
const listeners = new Set<(state: RedirectState) => void>();
export function onAuthRedirect(listener: (state: RedirectState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const completed = new Set<string>();
const pending = new Map<string, Promise<{ recovery: boolean }>>();
// Android puede entregar el mismo enlace al listener y al navegador OAuth.
export function consumeAuthUrl(url: string): Promise<{ recovery: boolean }> {
  const params = parseAuthRedirect(url);
  if (!params) return Promise.resolve({ recovery: false });
  if (pending.has(url)) return pending.get(url)!;
  if (completed.has(url)) return Promise.resolve({ recovery: false });
  const operation = (async () => {
    assertConfigured();
    listeners.forEach((listener) =>
      listener({ processing: true, recovery: params.recovery }),
    );
    let verifiedSession: Session | null = null;
    let recovery = params.recovery;
    try {
      if (params.error)
        throw new Error(
          "El enlace fue rechazado o venció. Solicita uno nuevo e inténtalo otra vez.",
        );
      if (params.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          params.code,
          params.flowId ? { flowId: params.flowId } : undefined,
        );
        if (error) throw error;
        verifiedSession = data.session;
        recovery =
          recovery ||
          ("redirectType" in data && data.redirectType === "recovery");
      } else if (params.accessToken && params.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        if (error) throw error;
        verifiedSession = data.session;
      } else
        throw new Error(
          "El enlace no contiene una sesión válida. Solicita un correo nuevo.",
        );
      if (!verifiedSession)
        throw new Error(
          "No se pudo verificar la sesión del enlace. Solicita un correo nuevo.",
        );
      completed.add(url);
      if (completed.size > 20)
        completed.delete(completed.values().next().value!);
      return { recovery };
    } finally {
      listeners.forEach((listener) =>
        listener({
          processing: false,
          recovery: !!verifiedSession && recovery,
          session: verifiedSession ?? undefined,
        }),
      );
    }
  })();
  pending.set(url, operation);
  void operation.finally(() => pending.delete(url)).catch(() => {});
  return operation;
}
export async function signInWithGoogle() {
  assertConfigured();
  assertInstalledApp();
  const redirectTo = getRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("No se pudo abrir Google.");
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return false;
  await consumeAuthUrl(result.url);
  return true;
}
export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
}
