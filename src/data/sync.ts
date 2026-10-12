import { LocalData, initialData } from "./trueke";
import { normalizeProfile } from "./profile";
import { normalizeFavorites } from "./favorites";

export type Records = Record<string, unknown>;
export type Operation = { id: string; key: string; value: unknown };
const fields = [
  "firstName",
  "lastName",
  "phone",
  "location",
  "bio",
  "photo",
  "coordinates",
] as const;
export function toRecords(data: LocalData): Records {
  const result: Records = { "setting/nearbyOnly": data.nearbyOnly };
  for (const field of fields) result["profile/" + field] = data.profile[field];
  for (const item of data.items) result["item/" + item.id] = item;
  for (const message of data.messages)
    result["message/" + message.id] = message;
  for (const entry of data.history) result["history/" + entry.id] = entry;
  for (const id of data.favorites) result["favorite/" + id] = true;
  return result;
}
export function changes(
  before: Records,
  after: Records,
  uuid: () => string,
): Operation[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        JSON.stringify(before[key] ?? null) !==
        JSON.stringify(after[key] ?? null),
    )
    .map((key) => ({ id: uuid(), key, value: after[key] ?? null }));
}
export function replay(records: Records, operations: Operation[]): Records {
  const result = { ...records };
  for (const op of operations) result[op.key] = op.value;
  return result;
}
export function fromRecords(records: Records, fallback: LocalData): LocalData {
  const profile = { ...fallback.profile };
  for (const field of fields)
    if (Object.hasOwn(records, "profile/" + field))
      Object.assign(profile, { [field]: records["profile/" + field] });
  function collection<T extends { id: string }>(
    prefix: string,
    existing: T[],
  ): T[] {
    const map = new Map(existing.map((value) => [value.id, value]));
    for (const [key, value] of Object.entries(records))
      if (key.startsWith(prefix)) {
        const id = key.slice(prefix.length);
        if (value === null) map.delete(id);
        else if (value && typeof value === "object" && (value as T).id === id)
          map.set(id, value as T);
      }
    return [...map.values()];
  }
  const items = collection("item/", fallback.items);
  const favorites = new Set(fallback.favorites);
  for (const [key, value] of Object.entries(records))
    if (key.startsWith("favorite/")) {
      if (value === true) favorites.add(key.slice(9));
      else favorites.delete(key.slice(9));
    }
  return {
    ...fallback,
    profile: normalizeProfile(profile),
    items,
    messages: collection("message/", fallback.messages).sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
    history: collection("history/", fallback.history),
    favorites: normalizeFavorites([...favorites], items),
    nearbyOnly:
      typeof records["setting/nearbyOnly"] === "boolean"
        ? records["setting/nearbyOnly"]
        : fallback.nearbyOnly,
  };
}
