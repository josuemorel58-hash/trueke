import type { Item, LocalData } from "./trueke";

// Migra instalaciones anteriores y descarta IDs repetidos o que ya no existen.
export function normalizeFavorites(value: unknown, items: Item[]): string[] {
  if (!Array.isArray(value)) return [];
  const available = new Set(items.map((item) => item.id));
  return [
    ...new Set(
      value.filter(
        (id): id is string => typeof id === "string" && available.has(id),
      ),
    ),
  ];
}
export function toggleFavorite(state: LocalData, id: string): LocalData {
  if (!state.items.some((item) => item.id === id)) return state;
  const favorites = normalizeFavorites(state.favorites, state.items);
  return {
    ...state,
    favorites: favorites.includes(id)
      ? favorites.filter((value) => value !== id)
      : [...favorites, id],
  };
}
