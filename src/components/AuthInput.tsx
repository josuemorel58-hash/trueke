import { useState } from 'react';
import {
  KeyboardTypeOptions,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: Props) {
  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA39A"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={styles.input}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10}>
            <Text style={styles.eye}>{hidden ? 'Ver' : 'Ocultar'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { color: '#344238', fontWeight: '600', fontSize: 14 },
  inputWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#D9E3D9',
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  input: { flex: 1, color: '#1B281E', fontSize: 16, paddingVertical: 13 },
  eye: { color: '#3A7D44', fontWeight: '700', fontSize: 13, marginLeft: 10 },
});
