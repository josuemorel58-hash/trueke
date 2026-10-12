import { Pressable, Text } from "react-native";
import { useTheme } from "../theme/ThemeContext";
export function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, ui, dark } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 18,
        justifyContent: "center",
        borderRadius: 24,
        backgroundColor: selected ? colors.green : colors.soft,
      }}
    >
      <Text
        style={{
          color: selected ? colors.onGreen : colors.ink,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
