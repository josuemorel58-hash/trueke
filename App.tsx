import { ThemeProvider, useTheme } from "./src/theme/ThemeContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/state/AuthContext";
import { TruekeProvider } from "./src/state/TruekeContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
function UserApp() {
  const { dark } = useTheme();
  const { session } = useAuth();
  return (
    <TruekeProvider
      key={session?.user.id ?? "guest"}
      userId={session?.user.id}
      userMetadata={session?.user.user_metadata}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <AppNavigator />
    </TruekeProvider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <UserApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
