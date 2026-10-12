import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { Appearance } from "react-native";
import "expo-sqlite/localStorage/install";
import { colors as lightColors, darkColors, createUi } from "./index";

export type ThemeMode = "system" | "light" | "dark";
const key = "trueke-appearance";
function savedMode(): ThemeMode {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}
const Context = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  dark: boolean;
  colors: typeof lightColors;
  ui: ReturnType<typeof createUi>;
} | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, updateMode] = useState<ThemeMode>(savedMode);
  const [system, setSystem] = useState(Appearance.getColorScheme);
  const dark = mode === "dark" || (mode === "system" && system === "dark");
  // unspecified elimina la preferencia de la app y vuelve a seguir el teléfono.
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) =>
      setSystem(colorScheme),
    );
    Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
    setSystem(Appearance.getColorScheme());
    return () => subscription.remove();
  }, [mode]);
  const colors = dark ? darkColors : lightColors;
  const ui = useMemo(() => createUi(colors), [colors]);
  function setMode(next: ThemeMode) {
    localStorage.setItem(key, next);
    updateMode(next);
  }
  return (
    <Context.Provider value={{ mode, setMode, dark, colors, ui }}>
      {children}
    </Context.Provider>
  );
}
export function useTheme() {
  const theme = useContext(Context);
  if (!theme) throw new Error("Falta ThemeProvider");
  return theme;
}
