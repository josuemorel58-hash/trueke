import type { Profile, SharedLocation } from "./trueke";

export const emptyProfile: Profile = {
  name: "",
  firstName: "",
  lastName: "",
  phone: "",
  location: "",
  bio: "",
  photo: "",
  coordinates: null,
};
const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function normalizePhone(value: string) {
  return value.replace(/[\s().-]/g, "");
}
export function profileError(profile: Profile): string {
  if (!profile.firstName.trim()) return "Escribe tus nombres.";
  if (!profile.lastName.trim()) return "Escribe tus apellidos.";
  if (!profile.location.trim()) return "Escribe tu ciudad o municipio.";
  if (
    profile.phone.trim() &&
    !/^\+[1-9]\d{7,14}$/.test(normalizePhone(profile.phone))
  )
    return "Escribe el teléfono con código de país, por ejemplo +1 809 555 0123, o deja el campo vacío.";
  return "";
}
function coordinates(value: unknown): SharedLocation | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.latitude !== "number" ||
    !Number.isFinite(v.latitude) ||
    Math.abs(v.latitude) > 90 ||
    typeof v.longitude !== "number" ||
    !Number.isFinite(v.longitude) ||
    Math.abs(v.longitude) > 180 ||
    typeof v.capturedAt !== "string" ||
    !Number.isFinite(Date.parse(v.capturedAt))
  )
    return null;
  return {
    latitude: Number(v.latitude.toFixed(3)),
    longitude: Number(v.longitude.toFixed(3)),
    accuracy:
      typeof v.accuracy === "number" &&
      Number.isFinite(v.accuracy) &&
      v.accuracy >= 0
        ? Math.max(120, v.accuracy)
        : null,
    capturedAt: v.capturedAt,
  };
}
// Conserva nombres antiguos completos sin inventar una separación de apellidos.
export function normalizeProfile(value: Partial<Profile>): Profile {
  const firstName = text(value.firstName, 60) || text(value.name, 120);
  const lastName = text(value.lastName, 80);
  return {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(" "),
    phone: normalizePhone(text(value.phone, 40)),
    location: text(value.location, 100),
    bio: text(value.bio, 240),
    photo: text(value.photo, 2000),
    coordinates: coordinates(value.coordinates),
  };
}
// La foto es una ruta de este teléfono; nunca se envía como URL de otra instalación.
export function profileMetadata(profile: Profile) {
  const { photo, ...fields } = normalizeProfile(profile);
  return { trueke_profile: fields };
}
export function restoreProfile(
  local: Partial<Profile> | undefined,
  metadata: Record<string, unknown> = {},
): Profile {
  const remote = metadata.trueke_profile;
  if (remote && typeof remote === "object" && !Array.isArray(remote))
    return normalizeProfile({
      ...(remote as Partial<Profile>),
      photo: local?.photo ?? "",
    });
  if (local) return normalizeProfile(local);
  return normalizeProfile({
    ...emptyProfile,
    firstName: text(metadata.given_name, 60) || text(metadata.full_name, 120),
    lastName: text(metadata.family_name, 80),
  });
}
