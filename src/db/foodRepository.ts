import * as Crypto from 'expo-crypto';
import { getDatabase } from './localDatabase';

export type FoodItem = {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  fecha_vencimiento: string | null;
};

export async function listActiveFoods(userId: string): Promise<FoodItem[]> {
  const db = await getDatabase();
  return db.getAllAsync<FoodItem>(
    `SELECT id, nombre, cantidad, unidad, fecha_vencimiento
     FROM alimentos
     WHERE user_id = ? AND estado = 'activo'
     ORDER BY fecha_vencimiento IS NULL, fecha_vencimiento ASC, created_at DESC`,
    userId
  );
}

export async function countConsumedFoods(userId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) AS total FROM alimentos WHERE user_id = ? AND estado = 'consumido'`,
    userId
  );
  return row?.total ?? 0;
}

export async function addFood(
  userId: string,
  food: { nombre: string; cantidad: number; unidad: string; fechaVencimiento: string | null }
) {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO alimentos
     (id, user_id, nombre, cantidad, unidad, fecha_vencimiento, estado,
      sync_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'activo', 'pending', ?, ?)`,
    Crypto.randomUUID(),
    userId,
    food.nombre,
    food.cantidad,
    food.unidad,
    food.fechaVencimiento,
    now,
    now
  );
}

export async function setFoodStatus(
  userId: string,
  foodId: string,
  status: 'consumido' | 'descartado'
) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE alimentos
     SET estado = ?, sync_status = 'pending', updated_at = ?
     WHERE id = ? AND user_id = ? AND estado = 'activo'`,
    status,
    new Date().toISOString(),
    foodId,
    userId
  );
}
