import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import * as SQLite from "expo-sqlite";
import * as Network from "expo-network";
import * as Crypto from "expo-crypto";
import { initialData, LocalData, Profile } from "../data/trueke";
import {
  restoreProfile,
  normalizeProfile,
  profileError,
} from "../data/profile";
import { useTheme } from "../theme/ThemeContext";
import { normalizeFavorites } from "../data/favorites";
import {
  changes,
  fromRecords,
  replay,
  toRecords,
  Operation,
} from "../data/sync";
import { exchange } from "../services/syncService";

type SyncInfo = {
  status: "offline" | "pending" | "syncing" | "synced" | "error";
  pending: number;
  lastSync: string | null;
  error: string;
};
type Store = {
  data: LocalData;
  sync: SyncInfo;
  update: (change: (previous: LocalData) => LocalData) => Promise<void>;
  refresh: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function TruekeProvider({
  children,
  userId,
  userMetadata,
}: {
  children: ReactNode;
  userId?: string;
  userMetadata?: Record<string, unknown>;
}) {
  const { ui } = useTheme();
  const [data, setData] = useState<LocalData | null>(null);
  const [error, setError] = useState("");
  const [sync, setSync] = useState<SyncInfo>({
    status: "pending",
    pending: 0,
    lastSync: null,
    error: "",
  });
  const current = useRef(initialData);
  const outbox = useRef<Operation[]>([]);
  const dbRef = useRef<SQLite.SQLiteDatabase | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const active = useRef(false);
  const online = useRef(false);
  const running = useRef(false);
  const metadata = useRef(userMetadata);
  function serialize<T>(work: () => Promise<T>): Promise<T> {
    const task = queue.current.then(work);
    queue.current = task.catch(() => {});
    return task;
  }
  // Datos y operaciones pendientes se confirman en la misma transacción local.
  async function persist(
    next: LocalData,
    operations: Operation[],
    lastSync?: string,
  ) {
    const db = dbRef.current!;
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT OR REPLACE INTO local_state(id,payload) VALUES(1,?)",
        JSON.stringify(next),
      );
      await db.runAsync(
        "UPDATE sync_state SET outbox = ?, last_sync = COALESCE(?, last_sync) WHERE id = 1",
        JSON.stringify(operations),
        lastSync ?? null,
      );
    });
    current.current = next;
    outbox.current = operations;
    if (active.current) {
      setData(next);
      setSync((previous) => ({
        ...previous,
        pending: operations.length,
        ...(lastSync ? { lastSync } : {}),
      }));
    }
  }
  async function synchronize() {
    if (!active.current || !dbRef.current || !userId || running.current) return;
    if (!online.current) {
      setSync((s) => ({ ...s, status: "offline" }));
      return;
    }
    running.current = true;
    setSync((s) => ({ ...s, status: "syncing", error: "" }));
    try {
      // Primero leemos: un dispositivo nuevo no sobrescribe la cuenta con ejemplos.
      let remote = await exchange(userId, []);
      if (!active.current) return;
      await serialize(async () => {
        if (!Object.keys(remote).length) {
          const keys = new Set(outbox.current.map((op) => op.key));
          const seed = changes(
            {},
            toRecords(current.current),
            Crypto.randomUUID,
          ).filter((op) => !keys.has(op.key));
          await persist(current.current, [...seed, ...outbox.current]);
        }
      });
      // La red nunca mantiene bloqueada la cola de escrituras SQLite.
      for (let round = 0; round < 10 && active.current; round++) {
        const batch = await serialize(async () => outbox.current.slice(0, 100));
        if (batch.length) remote = await exchange(userId, batch);
        if (!active.current) return;
        await serialize(async () => {
          const acknowledged = new Set(batch.map((op) => op.id));
          const remaining = outbox.current.filter(
            (op) => !acknowledged.has(op.id),
          );
          const next = fromRecords(replay(remote, remaining), current.current);
          // Si se acaba de subir una foto, conserva su copia local para usarla offline.
          if (
            !remaining.some((op) => op.key === "profile/photo") &&
            batch.some(
              (op) =>
                op.key === "profile/photo" &&
                op.value === current.current.profile.photo,
            )
          )
            next.profile.photo = current.current.profile.photo;
          await persist(next, remaining, new Date().toISOString());
        });
        if (!outbox.current.length) break;
      }
      if (active.current)
        setSync((s) => ({
          ...s,
          status: outbox.current.length ? "pending" : "synced",
          error: "",
        }));
    } catch (cause) {
      if (active.current) {
        const code = (cause as { code?: string })?.code;
        const message =
          code === "PGRST202" || code === "42P01"
            ? "Falta ejecutar trueke-sync.sql en Supabase. Tus cambios siguen guardados en este teléfono."
            : "No se pudo sincronizar. Tus cambios están guardados; se reintentará al tener conexión y una sesión válida.";
        setSync((s) => ({
          ...s,
          status: online.current ? "error" : "offline",
          error: message,
        }));
      }
    } finally {
      running.current = false;
    }
  }
  useEffect(() => {
    active.current = true;
    let subscription:
      ReturnType<typeof Network.addNetworkStateListener> | undefined;
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") void checkNetwork();
    });
    async function checkNetwork() {
      try {
        const state = await Network.getNetworkStateAsync();
        if (!active.current) return;
        online.current =
          state.isConnected === true && state.isInternetReachable !== false;
        void synchronize();
      } catch {
        online.current = false;
        if (active.current) setSync((s) => ({ ...s, status: "offline" }));
      }
    }
    void (async () => {
      const db = await SQLite.openDatabaseAsync(
        userId ? `trueke-user-${userId}.db` : "trueke-guest.db",
      );
      if (!active.current) return;
      await db.execAsync(
        "PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS local_state (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sync_state (id INTEGER PRIMARY KEY CHECK(id = 1), outbox TEXT NOT NULL, last_sync TEXT); INSERT OR IGNORE INTO sync_state VALUES(1,'[]',NULL);",
      );
      const row = await db.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM local_state WHERE id=1",
      );
      const pending = await db.getFirstAsync<{
        outbox: string;
        last_sync: string | null;
      }>("SELECT outbox,last_sync FROM sync_state WHERE id=1");
      const saved: LocalData = row ? JSON.parse(row.payload) : initialData;
      if (
        saved.version !== 1 ||
        !saved.profile ||
        !Array.isArray(saved.items) ||
        !Array.isArray(saved.messages) ||
        !Array.isArray(saved.history)
      )
        throw new Error("Formato incompatible");
      const migrated = {
        ...saved,
        favorites: normalizeFavorites(saved.favorites, saved.items),
        // La copia local puede tener ediciones offline: nunca sustituirla por metadatos antiguos.
        profile: row
          ? normalizeProfile(saved.profile)
          : restoreProfile(undefined, metadata.current),
      };
      dbRef.current = db;
      await persist(migrated, JSON.parse(pending!.outbox));
      if (!active.current) return;
      setSync((s) => ({ ...s, lastSync: pending!.last_sync }));
      subscription = Network.addNetworkStateListener((state) => {
        online.current =
          state.isConnected === true && state.isInternetReachable !== false;
        void synchronize();
      });
      await checkNetwork();
    })().catch(() => {
      if (active.current)
        setError(
          "No se pudieron abrir los datos del teléfono. Reinicia la app; no se ha borrado nada.",
        );
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void checkNetwork();
    }, 30000);
    return () => {
      active.current = false;
      subscription?.remove();
      app.remove();
      clearInterval(timer);
    };
  }, [userId]);
  async function update(change: (previous: LocalData) => LocalData) {
    await serialize(async () => {
      const next = change(current.current);
      const operations = changes(
        toRecords(current.current),
        toRecords(next),
        Crypto.randomUUID,
      );
      await persist(next, [...outbox.current, ...operations]);
      if (active.current)
        setSync((s) => ({
          ...s,
          status: online.current ? "pending" : "offline",
        }));
    });
    void synchronize();
  }
  async function saveProfile(profile: Profile) {
    const validation = profileError(profile);
    if (validation) throw new Error(validation);
    await update((state) => ({
      ...state,
      profile: { ...normalizeProfile(profile), photo: state.profile.photo },
    }));
  }
  async function refresh() {
    await synchronize();
  }
  if (!data)
    return (
      <View style={[ui.page, { justifyContent: "center", padding: 28 }]}>
        {error ? (
          <Text style={ui.error}>{error}</Text>
        ) : (
          <ActivityIndicator accessibilityLabel="Abriendo tus datos" />
        )}
      </View>
    );
  return (
    <Context.Provider value={{ data, sync, update, refresh, saveProfile }}>
      {children}
    </Context.Provider>
  );
}
export function useTrueke() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta TruekeProvider");
  return value;
}
