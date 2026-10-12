import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'outline';
};

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
}: Props) {
  const outline = variant === 'outline';

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        outline ? styles.outline : styles.primary,
        pressed && !loading ? styles.pressed : null,
        loading ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? '#2F6D3A' : '#FFFFFF'} />
      ) : (
        <Text style={[styles.text, outline ? styles.outlineText : null]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primary: { backgroundColor: '#2F7D45' },
  outline: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C9D8CA' },
  text: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  outlineText: { color: '#2F6D3A' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.65 },
});
