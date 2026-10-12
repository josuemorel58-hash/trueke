import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
export function Input({
  label,
  error,
  secureTextEntry,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const { colors, ui, dark } = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      <Text style={ui.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        secureTextEntry={!!secureTextEntry && !visible}
        keyboardAppearance={dark ? "dark" : "light"}
        selectionColor={colors.green}
        style={[
          {
            borderWidth: 1,
            borderColor: error ? colors.error : colors.border,
            borderRadius: 14,
            padding: 14,
            minHeight: 50,
            backgroundColor: colors.white,
            color: colors.ink,
            fontSize: 16,
          },
          props.style,
        ]}
      />
      {secureTextEntry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${visible ? "Ocultar" : "Mostrar"} ${label.toLowerCase()}`}
          accessibilityState={{
            disabled: props.editable === false,
            selected: visible,
          }}
          disabled={props.editable === false}
          onPress={() => setVisible((value) => !value)}
          style={{
            minHeight: 44,
            justifyContent: "center",
            alignSelf: "flex-end",
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: colors.green, fontWeight: "700" }}>
            {visible ? "Ocultar" : "Mostrar"} contraseña
          </Text>
        </Pressable>
      )}
      {error ? (
        <Text accessibilityLiveRegion="polite" style={ui.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
