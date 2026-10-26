
import { colors } from "@/constants/theme";
import { Stack } from "expo-router";

export default function CustosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
