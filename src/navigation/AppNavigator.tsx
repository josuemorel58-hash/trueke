import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { HomeScreen } from "../screens/trueke/HomeScreen";
import { ChangePasswordScreen } from "../screens/trueke/ChangePasswordScreen";
import {
  LoginScreen,
  ForgotPasswordScreen,
  RegisterScreen,
  ResetPasswordScreen,
} from "../screens/trueke/AuthScreens";
import {
  ProfileScreen,
  EditProfileScreen,
} from "../screens/trueke/ProfileScreen";
import {
  ChatsScreen,
  PublishScreen,
  SettingsScreen,
} from "../screens/trueke/ExtraScreens";
import { useAuth } from "../state/AuthContext";
import { useTheme } from "../theme/ThemeContext";
export type RootStack = {
  Login: undefined;
  Register: undefined;
  Reset: undefined;
  Forgot: undefined;
  Main: undefined;
  Publish: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Settings: undefined;
};
export type TabRoutes = {
  Inicio: undefined;
  Chats: undefined;
  "Mi perfil": undefined;
};
const Stack = createNativeStackNavigator<RootStack>();
const Tab = createBottomTabNavigator<TabRoutes>();
function MainTabs() {
  const { colors, ui, dark } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.cream },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 23 }}>
            {route.name === "Inicio" ? "⌂" : route.name === "Chats" ? "☏" : "○"}
          </Text>
        ),
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Chats" component={ChatsScreen} />
      <Tab.Screen name="Mi perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
export function AppNavigator() {
  const { colors, ui, dark } = useTheme();
  const { session, recovery } = useAuth();
  // Cambiar de sesión desmonta las rutas privadas y evita regresar a ellas.
  return (
    <NavigationContainer
      theme={{
        ...(dark ? DarkTheme : DefaultTheme),
        colors: {
          ...(dark ? DarkTheme.colors : DefaultTheme.colors),
          primary: colors.green,
          background: colors.cream,
          card: colors.cream,
          text: colors.ink,
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: colors.green,
          contentStyle: { backgroundColor: colors.cream },
        }}
      >
        {session && recovery ? (
          <Stack.Screen
            name="Reset"
            component={ResetPasswordScreen}
            options={{
              title: "Nueva contraseña",
              headerBackVisible: false,
              gestureEnabled: false,
            }}
          />
        ) : session ? (
          <Stack.Group navigationKey="session">
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Publish"
              component={PublishScreen}
              options={{ title: "Publicar objeto" }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ title: "Editar perfil" }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ title: "Configuración" }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ title: "Cambiar contraseña" }}
            />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey="guest">
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: "Crear cuenta" }}
            />
            <Stack.Screen
              name="Forgot"
              component={ForgotPasswordScreen}
              options={{ title: "Recuperar clave" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
