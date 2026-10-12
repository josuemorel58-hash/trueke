import { StyleSheet } from "react-native";
export const colors = {
  green: "#286348",
  ink: "#203C30",
  muted: "#6C776E",
  cream: "#F6F4EC",
  white: "#FFFFFF",
  border: "#DDDFD5",
  earth: "#AC6D43",
  error: "#AD3232",
  soft: "#E3EAD9",
  onGreen: "#FFFFFF",
};
export const darkColors: typeof colors = {
  green: "#85D6AB",
  ink: "#EDF5EF",
  muted: "#B0BFB5",
  cream: "#111B16",
  white: "#1E2C24",
  border: "#3B5042",
  earth: "#E3B28C",
  error: "#FF9D9D",
  soft: "#293E30",
  onGreen: "#10291B",
};
export const createUi = (colors: typeof import("./index").colors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.cream },
    content: {
      padding: 22,
      gap: 18,
      width: "100%",
      maxWidth: 800,
      alignSelf: "center",
      paddingBottom: 36,
    },
    title: { fontSize: 30, fontWeight: "800", color: colors.ink },
    heading: { fontSize: 21, fontWeight: "700", color: colors.ink },
    text: { fontSize: 16, color: colors.ink, lineHeight: 24 },
    muted: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    card: {
      backgroundColor: colors.white,
      padding: 20,
      borderRadius: 22,
      gap: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    link: { color: colors.green, fontWeight: "700", paddingVertical: 12 },
    error: { color: colors.error, lineHeight: 22 },
  });

export const ui = createUi(colors);
