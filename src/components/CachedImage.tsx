import { useEffect, useState } from "react";
import { Image, ImageProps, Text, View } from "react-native";
import * as Network from "expo-network";
import { cachedImage } from "../services/imageCache";
import { useTheme } from "../theme/ThemeContext";

export function CachedImage({
  uri,
  ...props
}: Omit<ImageProps, "source"> & { uri: string }) {
  const { ui, colors } = useTheme();
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    setSource("");
    async function load() {
      try {
        const path = await cachedImage(uri);
        if (active) setSource(path);
      } catch {
        /* Se muestra un estado local hasta que la conexión permita descargar. */
      }
    }
    void load();
    const listener = Network.addNetworkStateListener((state) => {
      if (state.isConnected) void load();
    });
    return () => {
      active = false;
      listener.remove();
    };
  }, [uri]);
  if (!source)
    return (
      <View
        style={[
          props.style,
          {
            backgroundColor: colors.soft,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <Text style={[ui.muted, { textAlign: "center", padding: 6 }]}>
          Foto no disponible sin conexión
        </Text>
      </View>
    );
  return (
    <Image {...props} source={{ uri: source }} onError={() => setSource("")} />
  );
}
