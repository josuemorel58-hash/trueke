const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
// Ejecutamos el servicio real con adaptadores nativos y red controlados.
function load(file, dependencies = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(js, {
    module,
    exports: module.exports,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(name);
      return dependencies[name];
    },
    URL,
    URLSearchParams,
    Set,
    Map,
    Promise,
    Error,
  });
  return module.exports;
}
const parser = load("src/services/authRedirect.ts");
const profiles = load("src/data/profile.ts");
function fixture({
  expo = false,
  exchangeError = null,
  redirectType = null,
} = {}) {
  const calls = [];
  const auth = {
    exchangeCodeForSession: async (code) => {
      calls.push(["exchange", code]);
      await Promise.resolve();
      return {
        data: {
          session: exchangeError ? null : { user: { id: "test-user" } },
          redirectType,
        },
        error: exchangeError,
      };
    },
    setSession: async (data) => {
      calls.push(["session", data]);
      return { data: { session: { user: { id: "test-user" } } }, error: null };
    },
    signUp: async (data) => {
      calls.push(["signup", data]);
      return { data: {}, error: null };
    },
    updateUser: async (data) => {
      calls.push(["updateUser", data]);
      return { data: {}, error: null };
    },
    reauthenticate: async () => {
      calls.push(["reauthenticate"]);
      return { error: null };
    },
    resetPasswordForEmail: async (...args) => {
      calls.push(["reset", ...args]);
      return { error: null };
    },
    signInWithOAuth: async (data) => {
      calls.push(["oauth", data]);
      return { data: { url: "https://example.com/oauth" }, error: null };
    },
  };
  const service = load("src/services/authService.ts", {
    "expo-web-browser": {
      maybeCompleteAuthSession() {},
      openAuthSessionAsync: async () => ({ type: "cancel" }),
    },
    "expo-constants": { appOwnership: expo ? "expo" : null },
    "@/lib/supabase": { supabase: { auth }, isSupabaseConfigured: true },
    "./authRedirect": parser,
    "../data/profile": profiles,
  });
  return { service, calls };
}
test("rechaza enlaces de otro esquema y rutas parecidas", () => {
  for (const url of [
    "https://evil.test/auth/reset?code=x",
    "evil://auth/reset?code=x",
    "refrigerio://auth/reset-extra?code=x",
  ])
    assert.equal(parser.parseAuthRedirect(url), null);
  assert.equal(
    parser.parseAuthRedirect("refrigerio://auth/reset?code=x").recovery,
    true,
  );
  assert.equal(
    parser.parseAuthRedirect("refrigerio:///auth/callback?code=x").code,
    "x",
  );
});
test("un enlace sin credenciales no inicia recuperación", async () => {
  const { service, calls } = fixture();
  const states = [];
  service.onAuthRedirect((s) => states.push(s));
  await assert.rejects(
    service.consumeAuthUrl("refrigerio://auth/reset"),
    /sesión válida/,
  );
  assert.equal(calls.length, 0);
  assert.equal(states.at(-1).recovery, false);
});
test("deduplica callback del navegador y evento del sistema", async () => {
  const { service, calls } = fixture();
  const url = "refrigerio://auth/callback?code=example";
  await Promise.all([service.consumeAuthUrl(url), service.consumeAuthUrl(url)]);
  await service.consumeAuthUrl(url);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "exchange");
});
test("recuperación PKCE y enlace vencido", async () => {
  const good = fixture();
  const states = [];
  good.service.onAuthRedirect((s) => states.push(s));
  assert.equal(
    (await good.service.consumeAuthUrl("refrigerio://auth/reset?code=valid"))
      .recovery,
    true,
  );
  assert.equal(states.at(-1).recovery, true);
  const bad = fixture({ exchangeError: new Error("expired") });
  const failed = [];
  bad.service.onAuthRedirect((s) => failed.push(s));
  await assert.rejects(
    bad.service.consumeAuthUrl("refrigerio://auth/reset?code=expired"),
    /expired/,
  );
  assert.equal(failed.at(-1).recovery, false);
});
test("registro y recuperación incluyen retorno a la app", async () => {
  const { service, calls } = fixture();
  await service.signUpWithEmail(" USER@EXAMPLE.COM ", "test-password");
  await service.requestPasswordReset(" USER@EXAMPLE.COM ");
  assert.equal(calls[0][1].email, "user@example.com");
  assert.equal(
    calls[0][1].options.emailRedirectTo,
    "refrigerio://auth/callback",
  );
  assert.equal(calls[1][2].redirectTo, "refrigerio://auth/reset");
});
test("Expo Go muestra limitación antes de solicitar un correo", async () => {
  const { service, calls } = fixture({ expo: true });
  await assert.rejects(
    service.requestPasswordReset("user@example.com"),
    /Expo Go/,
  );
  assert.equal(calls.length, 0);
});
test("cancelar Google no crea una sesión", async () => {
  const { service, calls } = fixture();
  assert.equal(await service.signInWithGoogle(), false);
  assert.equal(
    calls.filter((c) => c[0] === "exchange" || c[0] === "session").length,
    0,
  );
});

test("recuperación en raíz o login no se ignora al volver desde el correo", async () => {
  for (const route of ["", "login", "auth/login"]) {
    const { service } = fixture({ redirectType: "recovery" });
    const states = [];
    service.onAuthRedirect((state) => states.push(state));
    const result = await service.consumeAuthUrl(
      `refrigerio://${route}?code=email-code`,
    );
    assert.equal(result.recovery, true);
    assert.equal(states.at(-1).recovery, true);
    assert.equal(states.at(-1).session.user.id, "test-user");
  }
});
test("recuperación con tokens en raíz y retorno Google mantienen destinos distintos", async () => {
  const recovery = fixture();
  assert.equal(
    (
      await recovery.service.consumeAuthUrl(
        "refrigerio://#access_token=a&refresh_token=b&type=recovery",
      )
    ).recovery,
    true,
  );
  const google = fixture();
  assert.equal(
    (
      await google.service.consumeAuthUrl(
        "refrigerio://auth/callback?code=google",
      )
    ).recovery,
    false,
  );
  assert.equal(parser.parseAuthRedirect("refrigerio://"), null);
  assert.equal(parser.parseAuthRedirect("refrigerio://login"), null);
});
test("un error en el retorno raíz se muestra y no inicia recuperación", async () => {
  const { service } = fixture();
  await assert.rejects(
    service.consumeAuthUrl(
      "refrigerio://?error=access_denied&error_description=expired",
    ),
    /venció/,
  );
});

test("registro conserva el perfil y no envía rutas de fotos locales", async () => {
  const { service, calls } = fixture();
  await service.signUpWithEmail("ana@example.com", "test-password", {
    ...profiles.emptyProfile,
    firstName: " Ana María ",
    lastName: " Pérez ",
    location: " Puerto Plata ",
    phone: "+1 (809) 555-0123",
    photo: "file:///private/photo.jpg",
  });
  const saved = calls[0][1].options.data.trueke_profile;
  assert.equal(saved.name, "Ana María Pérez");
  assert.equal(saved.phone, "+18095550123");
  assert.equal(saved.location, "Puerto Plata");
  assert.equal("photo" in saved, false);
  assert.equal(saved.coordinates, null);
});

test("perfil rechaza teléfono inválido antes de registrar", async () => {
  const { service, calls } = fixture();
  await assert.rejects(
    service.signUpWithEmail("ana@example.com", "test-password", {
      ...profiles.emptyProfile,
      firstName: "Ana",
      lastName: "Pérez",
      location: "Puerto Plata",
      phone: "123",
    }),
    /código de país/,
  );
  assert.equal(calls.length, 0);
});

test("quitar ubicación reemplaza las coordenadas de la cuenta por null", async () => {
  const { service, calls } = fixture();
  await service.updateAccountProfile({
    ...profiles.emptyProfile,
    firstName: "Ana",
    lastName: "Pérez",
    location: "Puerto Plata",
  });
  assert.equal(calls[0][1].data.trueke_profile.coordinates, null);
});

test("migra perfiles existentes y recupera nombres del registro conservando la foto local", () => {
  const old = profiles.restoreProfile({
    name: "Ana María",
    bio: "Libros",
    photo: "file:///local.jpg",
    location: "Santiago",
  });
  assert.equal(old.firstName, "Ana María");
  assert.equal(old.lastName, "");
  assert.equal(old.coordinates, null);
  const restored = profiles.restoreProfile(old, {
    trueke_profile: {
      firstName: "Ana",
      lastName: "Pérez",
      location: "Puerto Plata",
      coordinates: null,
    },
  });
  assert.equal(restored.name, "Ana Pérez");
  assert.equal(restored.photo, "file:///local.jpg");
  assert.equal(restored.location, "Puerto Plata");
  assert.equal(profiles.restoreProfile(undefined).name, "");
});

test("descarta coordenadas inválidas y limita precisión", () => {
  const profile = {
    ...profiles.emptyProfile,
    coordinates: {
      latitude: 19.123456,
      longitude: -70.987654,
      accuracy: 5,
      capturedAt: "2026-10-11T15:00:00Z",
    },
  };
  assert.equal(profiles.normalizeProfile(profile).coordinates.latitude, 19.123);
  assert.equal(profiles.normalizeProfile(profile).coordinates.accuracy, 120);
  profile.coordinates.latitude = 190;
  assert.equal(profiles.normalizeProfile(profile).coordinates, null);
});

test("ubicación no lee GPS sin permiso y permite ciudad manual si falla geocodificación", async () => {
  let reads = 0;
  const native = {
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: async () => ({
      granted: false,
      canAskAgain: false,
    }),
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => {
      reads++;
      return {
        coords: { latitude: 19.123456, longitude: -70.987654, accuracy: 10 },
        timestamp: Date.now(),
      };
    },
    reverseGeocodeAsync: async () => {
      throw new Error("offline");
    },
  };
  const location = load("src/services/locationService.ts", {
    "expo-location": native,
  });
  await assert.rejects(location.captureLocation(), /ajustes/);
  assert.equal(reads, 0);
  native.requestForegroundPermissionsAsync = async () => ({ granted: true });
  const result = await location.captureLocation();
  assert.equal(result.city, "");
  assert.equal(result.coordinates.latitude, 19.123);
  native.hasServicesEnabledAsync = async () => false;
  await assert.rejects(location.captureLocation(), /Activa la ubicación/);
  assert.equal(reads, 1);
});

test("cambio de contraseña envía el código solo cuando es necesario", async () => {
  const { service, calls } = fixture();
  await service.updatePassword('new-password');
  assert.equal(calls[0][1].password, 'new-password');
  assert.equal('nonce' in calls[0][1], false);
  await service.requestPasswordVerification();
  await service.updatePassword('new-password', ' 123456 ');
  assert.equal(calls[1][0], 'reauthenticate');
  assert.equal(calls[2][1].nonce, '123456');
  assert.equal('data' in calls[2][1], false);
});

test("favoritos migra datos antiguos, elimina duplicados y conserva el resto del perfil", () => {
  const favorites = load('src/data/favorites.ts');
  const state = { items: [{ id: '1' }, { id: '2' }], profile: { name: 'Ana' }, messages: ['conversación'] };
  assert.equal(favorites.normalizeFavorites(undefined, state.items).length, 0);
  assert.equal(favorites.normalizeFavorites(['1', '1', 'missing', null], state.items).join(','), '1');
  const saved = favorites.toggleFavorite(state, '2');
  assert.equal(saved.favorites.join(','), '2');
  assert.equal(saved.profile, state.profile);
  assert.equal(saved.messages, state.messages);
  assert.equal(favorites.toggleFavorite(saved, '2').favorites.length, 0);
  assert.equal(favorites.toggleFavorite(saved, 'missing'), saved);
  assert.equal('favorites' in state, false);
  assert.equal(favorites.toggleFavorite({ ...state, favorites: [] }, '1').favorites.join(','), '1');
  assert.equal(saved.favorites.join(','), '2');
});

const sampleData = load('src/data/trueke.ts');
const favoriteHelpers = load('src/data/favorites.ts');
const syncHelpers = load('src/data/sync.ts', {
  './profile': profiles,
  './favorites': favoriteHelpers,
  './trueke': sampleData,
});
test('cola offline sobrevive a serializar y conserva cambios en campos distintos', () => {
  const before = sampleData.initialData;
  const after = { ...before, profile: { ...before.profile, phone: '+18095550123' }, favorites: ['2'] };
  let id = 0;
  const operations = JSON.parse(JSON.stringify(syncHelpers.changes(syncHelpers.toRecords(before), syncHelpers.toRecords(after), () => String(++id))));
  assert.equal(operations.length, 2);
  const server = { ...syncHelpers.toRecords(before), 'profile/bio': 'Editado desde otro teléfono' };
  const restored = syncHelpers.fromRecords(syncHelpers.replay(server, operations), before);
  assert.equal(restored.profile.phone, '+18095550123');
  assert.equal(restored.profile.bio, 'Editado desde otro teléfono');
  assert.equal(restored.favorites.join(','), '2');
});
test('repetir operaciones no duplica mensajes y quitar favorito genera una eliminación', () => {
  const before = { ...sampleData.initialData, favorites: ['2'] };
  const after = { ...before, favorites: [], messages: [...before.messages, { id: 'new', text: 'Hola', mine: true, date: '2026-10-11T20:00:00Z' }] };
  const operations = syncHelpers.changes(syncHelpers.toRecords(before), syncHelpers.toRecords(after), () => 'op');
  assert.equal(operations.find(op => op.key === 'favorite/2').value, null);
  const twice = syncHelpers.replay(syncHelpers.replay(syncHelpers.toRecords(before), operations), operations);
  const result = syncHelpers.fromRecords(twice, before);
  assert.equal(result.messages.filter(message => message.id === 'new').length, 1);
  assert.equal(result.favorites.length, 0);
});
test('una edición hecha durante el envío tiene prioridad sobre la respuesta remota', () => {
  const remote = { ...syncHelpers.toRecords(sampleData.initialData), 'profile/location': 'Puerto Plata' };
  const pending = [{ id: 'newer-op', key: 'profile/location', value: 'Santiago' }];
  const restored = syncHelpers.fromRecords(syncHelpers.replay(remote, pending), sampleData.initialData);
  assert.equal(restored.profile.location, 'Santiago');
  assert.equal(restored.items.length, sampleData.initialData.items.length);
});
