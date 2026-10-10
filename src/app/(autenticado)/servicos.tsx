import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Screen = "list" | "add" | "delete";

const services = [
  {
    name: "Limpeza de Pele",
    description: "Profunda com extracao e hidratacao",
    cost: "R$ 45,00",
    price: "R$ 150,00",
    icon: "radio-button-off-outline",
  },
  {
    name: "Drenagem Linfatica",
    description: "Corporal completa relaxante",
    cost: "R$ 60,00",
    price: "R$ 180,00",
    icon: "radio-button-off-outline",
  },
  {
    name: "Peeling Quimico",
    description: "Renovacao celular facial",
    cost: "R$ 80,00",
    price: "R$ 250,00",
    icon: "sparkles-outline",
  },
  {
    name: "Aplicacao Botox",
    description: "Por regiao / unidade especifica",
    cost: "R$ 350,00",
    price: "R$ 890,00",
    icon: "radio-button-off-outline",
  },
  {
    name: "Microagulhamento",
    description: "Inducao de colageno facial",
    cost: "R$ 120,00",
    price: "R$ 320,00",
    icon: "car-outline",
  },
  {
    name: "Massagem Modelad...",
    description: "Foco em reducao de medidas",
    cost: "R$ 50,00",
    price: "R$ 160,00",
    icon: "radio-button-off-outline",
  },
] as const;

export default function ServicosScreen() {
  const [screen, setScreen] = useState<Screen>("list");

  return (
    <View style={styles.routeBackground}>
      <SafeAreaView style={[styles.screen, screen === "delete" && styles.dimScreen]}>
        {screen === "list" && (
          <ServiceList
            onAdd={() => setScreen("add")}
            onBack={() => router.push("/home")}
            onOpenDelete={() => setScreen("delete")}
          />
        )}
        {screen === "add" && <ServiceForm onBack={() => setScreen("list")} />}
        {screen === "delete" && (
          <DeleteSheet onCancel={() => setScreen("list")} onConfirm={() => setScreen("list")} />
        )}
      </SafeAreaView>
    </View>
  );
}

function ServiceList({
  onAdd,
  onBack,
  onOpenDelete,
}: {
  onAdd: () => void;
  onBack: () => void;
  onOpenDelete: () => void;
}) {
  return (
    <>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerTitle}>
          <Text style={styles.backIcon}>{"<"}</Text>
          <Text style={styles.title}>Servicos</Text>
        </Pressable>
        <Pressable onPress={onAdd} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#8e8e93" />
        <Text style={styles.searchText}>Buscar servicos...</Text>
      </View>
      <ScrollView style={styles.listScroll} contentContainerStyle={styles.grid}>
        {services.map((service) => (
          <Pressable key={service.name} onPress={onOpenDelete} style={styles.serviceCard}>
            <View style={styles.cardTop}>
              <View style={styles.iconBox}>
                <Ionicons name={service.icon} size={16} color={palette.icon} />
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Ativo</Text>
              </View>
            </View>
            <Text style={styles.serviceName} numberOfLines={1}>
              {service.name}
            </Text>
            <Text style={styles.serviceDescription}>{service.description}</Text>
            <PriceRow label="Custo:" value={service.cost} />
            <PriceRow label="Venda:" value={service.price} highlight />
          </Pressable>
        ))}
        <View style={styles.countWrap}>
          <Text style={styles.countText}>Mostrando 6 de 18 servicos cadastrados</Text>
        </View>
      </ScrollView>
    </>
  );
}

function PriceRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={[styles.priceValue, highlight && styles.priceValueHighlight]}>{value}</Text>
    </View>
  );
}

function ServiceForm({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.formHeader}>
        <Pressable onPress={onBack} style={styles.formBackButton}>
          <Text style={styles.formBackIcon}>{"<"}</Text>
        </Pressable>
        <Text style={styles.formTitle}>Novo Servico</Text>
      </View>
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        <FormInput label="Nome do Servico" placeholder="Ex: Peeling de Diamante" focused />
        <FormInput
          label="Descricao"
          placeholder="Detalhes sobre o procedimento e beneficios..."
          multiline
        />
        <View style={styles.twoColumns}>
          <FormInput label="Valor de Custo (R$)" value="R$ 45,00" compact />
          <FormInput label="Valor de Venda (R$)" value="R$ 150,00" compact />
        </View>
        <View style={styles.twoColumns}>
          <FormInput label="Duracao Estimada" value="45 minutos" compact />
          <FormInput label="Categoria" value="Facial" compact />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Pressable onPress={onBack} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Salvar Servico</Text>
        </Pressable>
      </View>
    </>
  );
}

function FormInput({
  label,
  placeholder,
  value,
  focused,
  multiline,
  compact,
}: {
  label: string;
  placeholder?: string;
  value?: string;
  focused?: boolean;
  multiline?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.fieldGroup, compact && styles.fieldCompact]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.placeholder}
        multiline={multiline}
        style={[
          styles.input,
          focused && styles.inputFocused,
          multiline && styles.textArea,
          value && styles.inputValue,
        ]}
      />
    </View>
  );
}

function DeleteSheet({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.sheetScreen}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.deleteIcon}>
          <Text style={styles.deleteX}>x</Text>
        </View>
        <Text style={styles.sheetTitle}>Confirmar exclusao</Text>
        <Text style={styles.sheetBody}>Tem certeza que deseja excluir este servico?</Text>
        <Text style={styles.sheetNote}>Esta acao nao pode ser desfeita.</Text>
        <View style={styles.sheetActions}>
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Excluir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const palette = {
  background: "#f2f1f6",
  purpleTitle: "#4a1d6b",
  purple: "#5a2d82",
  button: "#8a4bb0",
  border: "#d8c8e8",
  softPurple: "#f2e9f7",
  text: "#1c1c1e",
  muted: "#8e8e93",
  placeholder: "#a9a9ad",
  line: "#e4e2ea",
  gold: "#c9a227",
  danger: "#e0433c",
  icon: "#5a2d82",
};

const fontFamily = Platform.select({
  web: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif",
  default: undefined,
});

const serifFont = Platform.select({
  web: "Georgia,'Times New Roman',serif",
  default: undefined,
});

const styles = StyleSheet.create({
  routeBackground: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: "center",
  },
  screen: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    backgroundColor: palette.background,
  },
  dimScreen: {
    backgroundColor: "#808080",
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backIcon: {
    fontFamily,
    fontSize: 28,
    lineHeight: 32,
    color: palette.purple,
    fontWeight: "500",
  },
  title: {
    fontFamily: serifFont,
    color: palette.purpleTitle,
    fontSize: 32,
    fontWeight: "700",
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: palette.button,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.button,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addButtonText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 26,
  },
  searchBox: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchText: {
    fontFamily,
    color: palette.placeholder,
    fontSize: 16,
  },
  listScroll: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 16,
    rowGap: 16,
  },
  serviceCard: {
    flexBasis: "47.8%",
    flexGrow: 1,
    maxWidth: "50%",
    minHeight: 178,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    backgroundColor: palette.softPurple,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    backgroundColor: palette.softPurple,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statusText: {
    fontFamily,
    color: palette.purple,
    fontSize: 12,
    fontWeight: "600",
  },
  serviceName: {
    fontFamily,
    color: palette.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  serviceDescription: {
    fontFamily,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 17.5,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  priceLabel: {
    fontFamily,
    color: palette.muted,
    fontSize: 13,
  },
  priceValue: {
    fontFamily,
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
  },
  priceValueHighlight: {
    color: palette.gold,
    fontWeight: "700",
  },
  countWrap: {
    width: "100%",
    alignItems: "center",
    paddingTop: 8,
  },
  countText: {
    fontFamily,
    color: "#9a9a9e",
    fontSize: 14,
  },
  formHeader: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  formBackButton: {
    width: 44,
    height: 44,
    backgroundColor: palette.softPurple,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  formBackIcon: {
    fontFamily,
    color: palette.purple,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26,
  },
  formTitle: {
    fontFamily: serifFont,
    color: palette.purpleTitle,
    fontSize: 26,
    fontWeight: "700",
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldCompact: {
    flex: 1,
  },
  label: {
    fontFamily,
    color: "#3c3c43",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontFamily,
    fontSize: 16,
    color: palette.placeholder,
  },
  inputValue: {
    color: palette.text,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: palette.gold,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  twoColumns: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  saveButton: {
    width: "100%",
    backgroundColor: palette.purple,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  sheetScreen: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: 32,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 4,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#d1d1d6",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  deleteIcon: {
    width: 64,
    height: 64,
    backgroundColor: "#fce8e8",
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  deleteX: {
    fontFamily,
    color: palette.danger,
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 34,
  },
  sheetTitle: {
    fontFamily,
    textAlign: "center",
    color: palette.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 12,
  },
  sheetBody: {
    fontFamily,
    textAlign: "center",
    color: "#6b6b6f",
    fontSize: 16,
    lineHeight: 22.5,
    marginBottom: 6,
  },
  sheetNote: {
    fontFamily,
    textAlign: "center",
    color: "#9a9a9e",
    fontSize: 14,
    marginBottom: 28,
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: palette.softPurple,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelText: {
    fontFamily,
    color: palette.purple,
    fontSize: 16,
    fontWeight: "700",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: palette.danger,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  deleteText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
