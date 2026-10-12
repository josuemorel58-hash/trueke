import * as Location from "expo-location";
import type { SharedLocation } from "../data/trueke";

export async function captureLocation(): Promise<{
  coordinates: SharedLocation;
  city: string;
}> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      permission.canAskAgain
        ? "No diste permiso de ubicación. Puedes continuar escribiendo tu ciudad."
        : "El permiso está desactivado. Puedes habilitarlo en los ajustes del teléfono o escribir tu ciudad.",
    );
  if (!(await Location.hasServicesEnabledAsync()))
    throw new Error(
      "Activa la ubicación del teléfono o escribe tu ciudad manualmente.",
    );
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  let city = "";
  try {
    const [address] = await Location.reverseGeocodeAsync(position.coords);
    city = [address?.city || address?.subregion, address?.region]
      .filter((v, i, all) => v && all.indexOf(v) === i)
      .join(", ");
  } catch {
    /* La geocodificación puede fallar sin impedir guardar las coordenadas. */
  }
  return {
    city,
    coordinates: {
      latitude: Number(position.coords.latitude.toFixed(3)),
      longitude: Number(position.coords.longitude.toFixed(3)),
      accuracy:
        position.coords.accuracy === null
          ? null
          : Math.max(120, position.coords.accuracy),
      capturedAt: new Date(position.timestamp).toISOString(),
    },
  };
}
