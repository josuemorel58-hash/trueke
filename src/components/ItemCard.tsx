import { CachedImage } from "./CachedImage";
import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import { Item } from "../data/trueke";
import { useTheme } from "../theme/ThemeContext";
import { useTrueke } from "../state/TruekeContext";
import { toggleFavorite } from "../data/favorites";
export function ItemCard({ item }: { item: Item }) {
  const { colors, ui, dark } = useTheme();
  const { data, update } = useTrueke();
  const [saving, setSaving] = useState(false);
  const favorite = data.favorites.includes(item.id);
  async function toggle() {
    if (saving) return;
    setSaving(true);
    try {
      await update((state) => toggleFavorite(state, item.id));
    } catch {
      Alert.alert("No se guardó el favorito", "Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 20,
        overflow: "hidden",
        flex: 1,
      }}
    >
      <CachedImage
        uri={item.photo}
        accessibilityLabel={item.title}
        style={{ width: "100%", height: 180 }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${favorite ? "Quitar de" : "Agregar a"} favoritos: ${item.title}`}
        accessibilityState={{
          selected: favorite,
          disabled: saving,
          busy: saving,
        }}
        disabled={saving}
        onPress={toggle}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          minWidth: 48,
          minHeight: 48,
          borderRadius: 24,
          backgroundColor: colors.white,
          alignItems: "center",
          justifyContent: "center",
          opacity: saving ? 0.5 : 1,
        }}
      >
        <Text style={{ fontSize: 28, color: colors.green }}>
          {favorite ? "♥" : "♡"}
        </Text>
      </Pressable>
      <View style={{ padding: 16, gap: 6 }}>
        <Text style={{ color: colors.earth, fontSize: 12, fontWeight: "700" }}>
          {item.category.toUpperCase()} · {item.condition.toUpperCase()}
        </Text>
        <Text style={ui.heading}>{item.title}</Text>
        <Text style={ui.muted}>
          {item.mine
            ? "Tu publicación"
            : `${item.owner} · A ${item.distance.toLocaleString("es")} km`}
        </Text>
        <Text style={{ color: colors.green, fontWeight: "600" }}>
          Disponible para trueque
        </Text>
      </View>
    </View>
  );
}
