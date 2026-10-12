import { useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTrueke } from "../../state/TruekeContext";
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";
import { Message } from "../../data/trueke";
import { useTheme } from "../../theme/ThemeContext";
export function ChatsScreen() {
  const { colors, ui, dark } = useTheme();
  const { data, update } = useTrueke();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Message>>(null);
  async function send() {
    if (!text.trim() || busy) return;
    setBusy(true);
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(16).slice(2),
      text: text.trim(),
      mine: true,
      date: new Date().toISOString(),
    };
    try {
      await update((state) => ({
        ...state,
        messages: [...state.messages, message],
      }));
      setText("");
    } catch {
      Alert.alert("No se guardó el mensaje", "Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView edges={["top"]} style={ui.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={ui.content}>
          <Text style={ui.title}>Chats</Text>
          <Text style={ui.heading}>María · Silla de madera</Text>
          <Text style={ui.muted}>
            Conversación de ejemplo. Los mensajes se guardan en el teléfono y se
            respaldan en tu cuenta al tener conexión; no se envían a otra
            persona.
          </Text>
        </View>
        <FlatList
          ref={list}
          data={data.messages}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() =>
            list.current?.scrollToEnd({ animated: true })
          }
          contentContainerStyle={[ui.content, { paddingTop: 0 }]}
          renderItem={({ item }) => (
            <View
              style={[
                ui.card,
                {
                  alignSelf: item.mine ? "flex-end" : "flex-start",
                  maxWidth: "90%",
                  backgroundColor: item.mine ? colors.soft : colors.white,
                },
              ]}
            >
              <Text style={ui.text}>{item.text}</Text>
              <Text style={ui.muted}>
                {new Date(item.date).toLocaleTimeString("es", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {item.mine ? "Guardado localmente" : "Ejemplo"}
              </Text>
            </View>
          )}
        />
        <View style={[ui.content, { paddingTop: 8, paddingBottom: 12 }]}>
          <Input
            label="Mensaje"
            placeholder="Propón un intercambio…"
            value={text}
            onChangeText={setText}
            maxLength={2000}
            editable={!busy}
          />
          <Button title="Guardar mensaje" onPress={send} loading={busy} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function PublishScreen() {
  const { colors, ui, dark } = useTheme();
  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.content}>
      <Text style={ui.title}>Dale otra vida</Text>
      <Text style={ui.text}>
        Aquí podrás añadir las fotos y los detalles de un objeto para
        intercambiarlo.
      </Text>
      <View style={ui.card}>
        <Text style={ui.heading}>Próximamente</Text>
        <Text style={ui.muted}>
          La publicación de objetos todavía no está habilitada en esta versión.
        </Text>
      </View>
    </ScrollView>
  );
}
export function SettingsScreen() {
  const { colors, ui, dark } = useTheme();
  const { data, update } = useTrueke();
  const [busy, setBusy] = useState(false);
  async function change(value: boolean) {
    setBusy(true);
    try {
      await update((state) => ({ ...state, nearbyOnly: value }));
    } catch {
      Alert.alert("No se pudo guardar", "Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.content}>
      <Text style={ui.heading}>A tu manera</Text>
      <View style={[ui.card, ui.row]}>
        <View style={{ flex: 1 }}>
          <Text style={ui.text}>Solo a 2 km o menos</Text>
          <Text style={ui.muted}>
            Filtra las distancias de ejemplo en Inicio.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Solo objetos a dos kilómetros o menos"
          disabled={busy}
          value={data.nearbyOnly}
          onValueChange={change}
        />
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Tus datos</Text>
        <Text style={ui.text}>
          Tus datos y cambios se guardan primero en el teléfono y se sincronizan
          con tu cuenta al tener internet. Puedes quitar la ubicación desde
          Editar perfil y guardar los cambios.
        </Text>
        <Text style={ui.muted}>
          La sincronización funciona con la app abierta o al volver a ella. Las
          fotos descargadas se pueden ver sin internet. El primer acceso y los
          cambios de contraseña necesitan conexión.
        </Text>
      </View>
    </ScrollView>
  );
}
