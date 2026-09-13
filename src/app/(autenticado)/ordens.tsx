// app/(autenticado)/ordens.tsx
import { View, Text, StyleSheet } from "react-native";

export default function Ordens() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Ordens de Serviço</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 16, color: "#333" },
});