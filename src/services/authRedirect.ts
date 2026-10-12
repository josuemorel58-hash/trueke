// Solo procesamos rutas de autenticación pertenecientes a nuestra app.
export function parseAuthRedirect(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "refrigerio:") return null;
  const route = `${parsed.hostname}${parsed.pathname}`.replace(
    /^\/+|\/+$/g,
    "",
  );
  const hash = new URLSearchParams(parsed.hash.slice(1));
  const read = (key: string) => parsed.searchParams.get(key) ?? hash.get(key);
  const knownRoute = route === "auth/callback" || route === "auth/reset";
  const fallbackRoute =
    route === "" || route === "login" || route === "auth/login";
  const hasAuthData = !!(
    read("code") ||
    read("access_token") ||
    read("error") ||
    read("error_description") ||
    read("type") === "recovery"
  );
  if (!knownRoute && !(fallbackRoute && hasAuthData)) return null;
  return {
    flowId: read("sb_flow_id"),
    code: read("code"),
    accessToken: read("access_token"),
    refreshToken: read("refresh_token"),
    recovery: route === "auth/reset" || read("type") === "recovery",
    error: read("error_description") ?? read("error"),
  };
}
export function authErrorMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    invalid_credentials: "El correo o la contraseña no son correctos.",
    email_not_confirmed:
      "Confirma tu correo antes de iniciar sesión. Puedes reenviar el enlace desde Crear cuenta.",
    user_already_exists: "Ya existe una cuenta con este correo. Inicia sesión.",
    over_email_send_rate_limit:
      "Se alcanzó el límite de correos. Espera unos minutos antes de intentarlo otra vez.",
    over_request_rate_limit: "Demasiados intentos. Espera unos minutos.",
    weak_password:
      "La contraseña no cumple los requisitos de seguridad. Prueba una más larga con letras, números y símbolos.",
    otp_expired: "El enlace venció o ya fue utilizado. Solicita uno nuevo.",
    flow_state_not_found:
      "Solicita un enlace nuevo desde este teléfono y ábrelo en la misma app.",
    bad_code_verifier:
      "Este enlace pertenece a otro intento o dispositivo. Solicita uno nuevo desde esta app.",
    same_password: "Elige una contraseña diferente a la anterior.",
  };
  if (code && messages[code]) return messages[code];
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación. Revisa tu conexión e inténtalo de nuevo.";
}
