import { Text, View } from "react-native";
import { useTrueke } from "../state/TruekeContext";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "./Button";
export function SyncStatus({ detailed = false }: { detailed?: boolean }) {
  const { sync, refresh } = useTrueke();
  const { ui } = useTheme();
  const labels = {
    offline: "Sin conexión · Guardado en el teléfono",
    pending: "Cambios pendientes",
    syncing: "Sincronizando…",
    synced: "Sincronizado con Supabase",
    error: "Sincronización pendiente",
  };
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityLiveRegion="polite" style={ui.muted}>
        {labels[sync.status]}
        {sync.pending ? ` · ${sync.pending} cambios` : ""}
      </Text>
      {detailed && (
        <>
          {sync.lastSync && (
            <Text style={ui.muted}>
              Última sincronización:{" "}
              {new Date(sync.lastSync).toLocaleString("es")}
            </Text>
          )}
          {sync.error ? <Text style={ui.error}>{sync.error}</Text> : null}
          <Button
            title="Sincronizar ahora"
            secondary
            loading={sync.status === "syncing"}
            onPress={() => void refresh()}
          />
        </>
      )}
    </View>
  );
}
