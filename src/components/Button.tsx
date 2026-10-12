import { ActivityIndicator, Pressable, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
export function Button({
  title,
  onPress,
  loading = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
}) {
  const { colors, ui, dark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        borderRadius: 15,
        padding: 14,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.green,
        backgroundColor: secondary ? colors.white : colors.green,
        opacity: pressed || loading ? 0.65 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.green : colors.onGreen} />
      ) : (
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            textAlign: "center",
            color: secondary ? colors.green : colors.onGreen,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
