import { SyncStatus } from "../../components/SyncStatus";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStack } from "../../navigation/AppNavigator";
import { useTrueke } from "../../state/TruekeContext";
import { categories } from "../../data/trueke";
import { Input } from "../../components/Input";
import { CategoryChip } from "../../components/CategoryChip";
import { ItemCard } from "../../components/ItemCard";
import { useTheme } from "../../theme/ThemeContext";

export function HomeScreen() {
  const { colors, ui, dark } = useTheme();
  const { data, refresh } = useTrueke();
  const navigation = useNavigation<NativeStackNavigationProp<RootStack>>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [refreshing, setRefreshing] = useState(false);
  const columns = useWindowDimensions().width >= 600 ? 2 : 1;
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const items = data.items.filter(
    (item) =>
      (category === "Todos" || category === item.category) &&
      normalize(item.title).includes(normalize(search.trim())) &&
      (!data.nearbyOnly || item.distance <= 2),
  );
  async function reload() {
    setRefreshing(true);
    try {
      await refresh();
    } catch {
      Alert.alert("No se pudo actualizar", "Inténtalo de nuevo.");
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <SafeAreaView edges={["top"]} style={ui.page}>
      <FlatList
        key={columns}
        numColumns={columns}
        data={items}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={reload}
        contentContainerStyle={[ui.content, { paddingBottom: 100 }]}
        columnWrapperStyle={columns > 1 ? { gap: 16 } : undefined}
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 20 }}>
            <SyncStatus />
            <View>
              <Text
                style={{ color: colors.green, fontSize: 22, fontWeight: "900" }}
              >
                trueke ↔
              </Text>
              <Text style={ui.title}>
                {data.profile.name ? `Hola, ${data.profile.name}` : "Hola"} 🌿
              </Text>
              <Text style={ui.muted}>
                {data.profile.location
                  ? `Cerca de ti: ${data.profile.location}`
                  : "Completa tu ciudad desde Mi perfil"}
              </Text>
            </View>
            <View style={[ui.card, { backgroundColor: colors.soft }]}>
              <Text style={ui.heading}>
                Lo que ya no usas,{"\n"}alguien lo necesita.
              </Text>
              <Text style={ui.text}>
                Dale otra vida. Intercambia, sin dinero.
              </Text>
            </View>
            <Input
              label="Encuentra tu próximo trueque"
              placeholder="Busca libros, ropa, herramientas…"
              value={search}
              onChangeText={setSearch}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {["Todos", ...categories].map((label) => (
                <CategoryChip
                  key={label}
                  label={label}
                  selected={category === label}
                  onPress={() => setCategory(label)}
                />
              ))}
            </ScrollView>
            <Text style={ui.muted}>
              {items.length} objetos · Ubicación y distancias de ejemplo
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1, marginBottom: 16 }}>
            <ItemCard
              item={{
                ...item,
                owner: item.mine ? data.profile.name : item.owner,
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={ui.card}>
            <Text style={ui.heading}>Todavía no hay coincidencias</Text>
            <Text style={ui.muted}>Prueba otra búsqueda o categoría.</Text>
            <Pressable
              onPress={() => {
                setSearch("");
                setCategory("Todos");
              }}
            >
              <Text style={ui.link}>Limpiar búsqueda y categoría</Text>
            </Pressable>
          </View>
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Publicar un objeto"
        onPress={() => navigation.navigate("Publish")}
        style={{
          position: "absolute",
          bottom: 22,
          right: 24,
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.green,
          elevation: 5,
        }}
      >
        <Text style={{ fontSize: 34, color: colors.onGreen }}>+</Text>
      </Pressable>
    </SafeAreaView>
  );
}
