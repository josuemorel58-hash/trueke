import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase() {
  if (!database) {
    database = await SQLite.openDatabaseAsync('refrigerio.db');
  }
  return database;
}

export async function initializeLocalDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS alimentos (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      nombre TEXT NOT NULL,
      cantidad REAL NOT NULL DEFAULT 1,
      unidad TEXT NOT NULL DEFAULT 'unidad',
      categoria TEXT,
      codigo_barras TEXT,
      fecha_compra TEXT,
      fecha_vencimiento TEXT,
      precio REAL,
      estado TEXT NOT NULL DEFAULT 'activo',
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lista_compras (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      nombre TEXT NOT NULL,
      cantidad REAL NOT NULL DEFAULT 1,
      unidad TEXT NOT NULL DEFAULT 'unidad',
      comprado INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS precios_abiertos_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      contenido TEXT NOT NULL,
      revisado_at TEXT NOT NULL
    );
  `);
}

export async function saveLocalUser(userId: string, email: string | null) {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`,
    'current_user',
    JSON.stringify({ userId, email })
  );
}

export async function clearLocalUser() {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM app_settings WHERE key = ?`, 'current_user');
}
