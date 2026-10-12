import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ThemeMode, useTheme } from "../theme/ThemeContext";

// Iconos geométricos: mantienen el mismo trazo en Android e iOS sin fuentes externas.
function ThemeIcon({
  mode,
  color,
  background,
}: {
  mode: ThemeMode;
  color: string;
  background: string;
}) {
  return (
    <View
      style={styles.icon}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {mode === "light" ? (
        <>
          <View style={[styles.sun, { borderColor: color }]} />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <View
              key={angle}
              style={[
                styles.rayAxis,
                { transform: [{ rotate: `${angle}deg` }] },
              ]}
            >
              <View style={[styles.ray, { backgroundColor: color }]} />
            </View>
          ))}
        </>
      ) : mode === "dark" ? (
        <View style={[styles.moon, { backgroundColor: color }]}>
          <View style={[styles.moonCutout, { backgroundColor: background }]} />
        </View>
      ) : (
        <View style={[styles.phone, { borderColor: color }]}>
          <View style={[styles.speaker, { backgroundColor: color }]} />
          <View style={[styles.home, { backgroundColor: color }]} />
        </View>
      )}
    </View>
  );
}

export function AppearanceSettings() {
  const { mode, setMode, ui, colors } = useTheme();
  const options: [ThemeMode, string][] = [
    ["light", "Claro"],
    ["dark", "Oscuro"],
    ["system", "Según el teléfono"],
  ];
  return (
    <View style={[ui.card, { gap: 14 }]}>
      <Text style={ui.heading}>Apariencia</Text>
      <View style={styles.options}>
        {options.map(([value, label]) => {
          const selected = mode === value;
          const background = selected ? colors.soft : colors.white;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityHint="Cambia la apariencia de toda la aplicación"
              accessibilityState={{ checked: selected }}
              onPress={() => {
                try {
                  setMode(value);
                } catch {
                  Alert.alert(
                    "No se pudo guardar la apariencia",
                    "Inténtalo de nuevo.",
                  );
                }
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: background,
                  borderColor: selected ? colors.green : colors.border,
                  opacity: pressed ? 0.65 : 1,
                },
              ]}
            >
              <ThemeIcon
                mode={value}
                color={selected ? colors.green : colors.muted}
                background={background}
              />
              <View
                style={[
                  styles.indicator,
                  { backgroundColor: selected ? colors.green : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={ui.muted}>
        {options.find(([value]) => value === mode)?.[1]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: "row", gap: 12 },
  option: {
    flex: 1,
    minHeight: 76,
    borderWidth: 2,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  indicator: { width: 5, height: 5, borderRadius: 3 },
  icon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  sun: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  rayAxis: { position: "absolute", width: 2, height: 30, alignItems: "center" },
  ray: { width: 2, height: 5, borderRadius: 1 },
  moon: { width: 25, height: 25, borderRadius: 13, overflow: "hidden" },
  moonCutout: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    top: -5,
    right: -6,
  },
  phone: {
    width: 19,
    height: 29,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
  },
  speaker: { width: 7, height: 2, borderRadius: 1, top: 3 },
  home: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 2,
    borderRadius: 1,
  },
});
