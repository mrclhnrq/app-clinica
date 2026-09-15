export const colors = {
  primary: "#7B3F98",
  primaryDark: "#8B3F97",
  primaryLight: "#F0E6F5",
  gold: "#C9962C",
  background: "#F4EEF8",
  white: "#fff",
  text: "#333",
  textMuted: "#666",
  textLight: "#999",
  border: "#ddd",
  borderLight: "#e5dbee",
  danger: "#E53935",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  pill: 30,
  circle: 9999,
} as const;

export const typography = {
  title: { fontSize: 22, fontWeight: "700" as const },
  subtitle: { fontSize: 17, fontWeight: "700" as const },
  label: { fontSize: 13 },
  body: { fontSize: 15 },
  small: { fontSize: 12 },
  button: { fontSize: 16, fontWeight: "600" as const },
};