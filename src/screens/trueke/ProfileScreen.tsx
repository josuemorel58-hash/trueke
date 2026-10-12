import { CachedImage } from "../../components/CachedImage";
import { SyncStatus } from "../../components/SyncStatus";
import { AppearanceSettings } from "../../components/AppearanceSettings";
import { ProfileFields } from "../../components/ProfileFields";
import { profileError } from "../../data/profile";
import { authErrorMessage } from "../../services/authRedirect";
import { signOut } from "../../services/authService";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStack } from "../../navigation/AppNavigator";
import { useTrueke } from "../../state/TruekeContext";
import { useAuth } from "../../state/AuthContext";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { ItemCard } from "../../components/ItemCard";
import { CategoryChip } from "../../components/CategoryChip";
import { useTheme } from "../../theme/ThemeContext";

export function ProfileScreen() {
  const { colors, ui, dark } = useTheme();
  const { data, update } = useTrueke();
  const { session } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const [section, setSection] = useState("Mis objetos");
  const [busy, setBusy] = useState(false);
  const mine = data.items.filter((item) => item.mine);
  const favorites = data.items.filter((item) =>
    data.favorites.includes(item.id),
  );
  async function photo(camera: boolean) {
    setBusy(true);
    let destination: string | undefined;
    try {
      const permission = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permiso necesario",
          "Permite el acceso desde los ajustes del teléfono para cambiar tu foto.",
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      // Guardamos una copia permanente, no la URI temporal del selector.
      if (!FileSystem.documentDirectory)
        throw new Error("Almacenamiento no disponible");
      const directory = FileSystem.documentDirectory + "trueke/";
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const extension =
        result.assets[0].uri.split(".").pop()?.split("?")[0] || "jpg";
      destination = directory + "profile-" + Date.now() + "." + extension;
      await FileSystem.copyAsync({
        from: result.assets[0].uri,
        to: destination,
      });
      const previous = data.profile.photo;
      const savedPhoto = destination;
      await update((state) => ({
        ...state,
        profile: { ...state.profile, photo: savedPhoto },
      }));
      destination = undefined;
      // Las fotos anteriores pueden pertenecer a operaciones pendientes de sincronizar.
    } catch {
      if (destination)
        await FileSystem.deleteAsync(destination, { idempotent: true }).catch(
          () => {},
        );
      Alert.alert(
        "No se pudo guardar la foto",
        "Comprueba los permisos y el espacio disponible e inténtalo de nuevo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await signOut();
    } catch {
      Alert.alert("No se pudo cerrar sesión", "Inténtalo de nuevo.");
    }
  }
  return (
    <SafeAreaView edges={["top"]} style={ui.page}>
      <ScrollView contentContainerStyle={ui.content}>
        <Text style={ui.title}>Mi perfil</Text>
        <AppearanceSettings />
        <SyncStatus detailed />
        {profileError(data.profile) ? (
          <View style={ui.card}>
            <Text style={ui.heading}>Completa tu perfil</Text>
            <Text style={ui.muted}>
              Añade tus nombres, apellidos y ciudad desde Editar perfil.
            </Text>
          </View>
        ) : null}
        <View style={[ui.card, { alignItems: "center" }]}>
          {data.profile.photo ? (
            <CachedImage
              uri={data.profile.photo}
              accessibilityLabel="Tu foto de perfil"
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
          ) : (
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: colors.soft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 40, color: colors.green }}>
                {data.profile.name.slice(0, 1).toUpperCase() || "T"}
              </Text>
            </View>
          )}
          <Text style={ui.heading}>{data.profile.name || "Tu perfil"}</Text>
          <Text style={ui.muted}>
            {data.profile.location || "Añade tu ciudad"}
          </Text>
          <Text style={ui.muted}>
            {data.profile.phone
              ? "Teléfono: " + data.profile.phone + " · Sin verificar"
              : "Teléfono sin añadir"}
          </Text>
          <Text style={ui.muted}>
            {data.profile.coordinates
              ? "Ubicación aproximada guardada en tu cuenta"
              : "Ubicación del dispositivo sin compartir"}
          </Text>
          <Text style={[ui.text, { textAlign: "center" }]}>
            {data.profile.bio}
          </Text>
          <Button
            title="Cambiar foto"
            loading={busy}
            secondary
            onPress={() =>
              Alert.alert("Cambiar foto", "Elige el origen", [
                { text: "Cámara", onPress: () => photo(true) },
                { text: "Galería", onPress: () => photo(false) },
                { text: "Cancelar", style: "cancel" },
              ])
            }
          />
        </View>
        <View style={ui.card}>
          <Text style={ui.heading}>Mis datos</Text>
          {[
            ["Nombres", data.profile.firstName],
            ["Apellidos", data.profile.lastName],
            ["Correo electrónico", session?.user.email],
            ["Teléfono de contacto", data.profile.phone],
            ["Ciudad o municipio", data.profile.location],
            ["Sobre mí", data.profile.bio],
          ].map(([label, value]) => (
            <View key={label} style={{ gap: 4 }}>
              <Text style={ui.muted}>{label}</Text>
              <Text selectable style={ui.text}>
                {value || "Sin añadir"}
              </Text>
            </View>
          ))}
        </View>
        <View style={[ui.card, ui.row, { justifyContent: "space-around" }]}>
          {[
            [mine.length, "Publicados"],
            [data.history.length, "Intercambios"],
            [favorites.length, "Favoritos"],
            ["—", "Sin calificaciones"],
          ].map(([value, label]) => (
            <View key={label} style={{ alignItems: "center" }}>
              <Text style={ui.heading}>{value}</Text>
              <Text style={ui.muted}>{label}</Text>
            </View>
          ))}
        </View>
        <Button
          title="Editar perfil"
          onPress={() => navigation.navigate("EditProfile")}
        />
        <Button
          title="Cambiar contraseña"
          secondary
          onPress={() => navigation.navigate("ChangePassword")}
        />
        <View style={ui.row}>
          {["Mis objetos", "Favoritos", "Historial de trueques"].map(
            (label) => (
              <CategoryChip
                key={label}
                label={label}
                selected={section === label}
                onPress={() => setSection(label)}
              />
            ),
          )}
        </View>
        {section === "Mis objetos" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {mine.map((item) => (
              <View
                key={item.id}
                style={{ width: "47%", minWidth: 130, flexGrow: 1 }}
              >
                <ItemCard item={{ ...item, owner: data.profile.name }} />
              </View>
            ))}
            {!mine.length && (
              <Text style={ui.muted}>Aún no tienes objetos publicados.</Text>
            )}
          </View>
        ) : section === "Favoritos" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {favorites.map((item) => (
              <View
                key={item.id}
                style={{ width: "47%", minWidth: 130, flexGrow: 1 }}
              >
                <ItemCard
                  item={{
                    ...item,
                    owner: item.mine ? data.profile.name : item.owner,
                  }}
                />
              </View>
            ))}
            {!favorites.length && (
              <View style={ui.card}>
                <Text style={ui.heading}>Guarda tu próximo trueque</Text>
                <Text style={ui.muted}>
                  Toca el corazón de un objeto en Inicio para verlo aquí. Tus
                  favoritos se conservan en este teléfono.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={ui.card}>
            {data.history.length ? (
              data.history.map((entry) => (
                <Text key={entry.id} style={ui.text}>
                  {entry.title} · {entry.date}
                </Text>
              ))
            ) : (
              <>
                <Text style={ui.heading}>Tu próxima historia empieza aquí</Text>
                <Text style={ui.muted}>
                  Todavía no has completado ningún intercambio.
                </Text>
              </>
            )}
          </View>
        )}
        <Button
          title="Configuración"
          secondary
          onPress={() => navigation.navigate("Settings")}
        />
        <Button title="Cerrar sesión" secondary onPress={logout} />
        <Text style={ui.muted}>
          Tus datos se conservan en este teléfono al cerrar sesión.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
export function EditProfileScreen({
  navigation,
}: NativeStackScreenProps<RootStack, "EditProfile">) {
  const { ui } = useTheme();
  const { data, saveProfile } = useTrueke();
  const [profile, setProfile] = useState({ ...data.profile });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  async function save() {
    if (busy || locating) return;
    const validation = profileError(profile);
    setError(validation);
    if (validation) return;
    setBusy(true);
    try {
      await saveProfile(profile);
      navigation.goBack();
    } catch (cause) {
      setError(authErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.content}
      >
        <Text style={ui.heading}>Cuéntanos sobre ti</Text>
        <ProfileFields
          value={profile}
          onChange={(change) =>
            setProfile((previous) => ({ ...previous, ...change }))
          }
          disabled={busy}
          onLocating={setLocating}
        />
        <Text style={ui.muted}>
          Guarda los cambios incluso sin internet. Se sincronizarán al recuperar
          conexión. Puedes quitar la ubicación compartida y seguir usando tu
          ciudad.
        </Text>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={ui.error}>
            {error}
          </Text>
        ) : null}
        <Button
          title="Guardar cambios"
          loading={busy || locating}
          onPress={save}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
