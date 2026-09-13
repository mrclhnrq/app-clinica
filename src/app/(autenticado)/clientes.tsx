// app/(autenticado)/clientes.tsx
import { View, Text, StyleSheet } from "react-native";

export default function Clientes() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Clientes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, color: "#333" },
});