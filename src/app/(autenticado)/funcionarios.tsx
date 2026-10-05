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

type Screen = "list" | "detail" | "add" | "delete";

const employees = [
  {
    initials: "CS",
    name: "Camila Soares",
    status: "Ativo",
    statusTone: "active",
    role: "Fisioterapeuta Dermatofuncional",
    email: "camila.soares@clinica.com.br",
  },
  {
    initials: "RA",
    name: "Rodrigo Alves",
    status: "Ativo",
    statusTone: "active",
    role: "Medico Dermatologista",
    email: "rodrigo.alves@clinica.com.br",
  },
  {
    initials: "MT",
    name: "Mariana Teixeira",
    status: "Ferias",
    statusTone: "away",
    role: "Esteticista Senior",
    email: "mariana.t@clinica.com.br",
  },
] as const;

export default function FuncionariosScreen() {
  const [screen, setScreen] = useState<Screen>("list");

  return (
    <View style={styles.routeBackground}>
      <SafeAreaView style={[styles.screen, screen === "delete" && styles.dimScreen]}>
        {screen === "list" && (
          <EmployeeList
            onAdd={() => setScreen("add")}
            onBack={() => router.push("/home")}
            onOpen={() => setScreen("detail")}
          />
        )}
        {screen === "detail" && (
          <EmployeeDetail
            onBack={() => setScreen("list")}
            onDelete={() => setScreen("delete")}
          />
        )}
        {screen === "add" && <EmployeeForm onBack={() => setScreen("list")} />}
        {screen === "delete" && (
          <DeleteSheet onCancel={() => setScreen("detail")} onConfirm={() => setScreen("list")} />
        )}
      </SafeAreaView>
    </View>
  );
}

function AdminBar() {
  return (
    <View style={styles.adminBar}>
      <View style={styles.adminShield}>
        <Ionicons name="shield-checkmark-outline" size={16} color={palette.primary} />
      </View>
      <Text style={styles.adminText}>MODO ADMINISTRADOR</Text>
    </View>
  );
}

function Header({
  title,
  onBack,
  action,
  close = false,
}: {
  title: string;
  onBack: () => void;
  action?: React.ReactNode;
  close?: boolean;
}) {
  return (
    <View style={close ? styles.formHeader : styles.header}>
      <Pressable onPress={onBack} style={close ? styles.formHeaderTitle : styles.headerTitle}>
        <Text style={close ? styles.closeIcon : styles.backIcon}>{close ? "x" : "<"}</Text>
        <Text style={close ? styles.formTitle : styles.title}>{title}</Text>
      </Pressable>
      {action}
    </View>
  );
}

function EmployeeList({
  onAdd,
  onBack,
  onOpen,
}: {
  onAdd: () => void;
  onBack: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <AdminBar />
      <Header
        title="Funcionarios"
        onBack={onBack}
        action={
          <Pressable onPress={onAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        }
      />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#aaaaaa" />
          <Text style={styles.searchText}>Buscar funcionarios...</Text>
        </View>
      </View>
      <View style={styles.employeeList}>
        {employees.map((employee) => (
          <Pressable key={employee.email} onPress={onOpen} style={styles.employeeCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{employee.initials}</Text>
            </View>
            <View style={styles.employeeInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.employeeName}>{employee.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    employee.statusTone === "away" && styles.statusBadgeAway,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      employee.statusTone === "away" && styles.statusTextAway,
                    ]}>
                    {employee.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.employeeRole}>{employee.role}</Text>
              <Text style={styles.employeeEmail}>{employee.email}</Text>
            </View>
            <Text style={styles.chevron}>{">"}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.countWrap}>
        <Text style={styles.countText}>Mostrando 3 de 14 funcionarios cadastrados</Text>
      </View>
    </>
  );
}

function EmployeeDetail({
  onBack,
  onDelete,
}: {
  onBack: () => void;
  onDelete: () => void;
}) {
  const employee = employees[0];

  return (
    <>
      <AdminBar />
      <Header title="Ficha do Funcionario" onBack={onBack} />
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileHead}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{employee.initials}</Text>
            </View>
            <View style={styles.profileTitleWrap}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{employee.name}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{employee.status}</Text>
                </View>
              </View>
              <Text style={styles.profileRole}>{employee.role}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoList}>
            <InfoRow label="E-MAIL FUNCIONAL" value={employee.email} />
            <InfoRow label="TELEFONE" value="(11) 98888-7777" />
            <InfoRow label="DATA DE ADMISSAO" value="14/02/2024" />
            <InfoRow label="PERMISSAO" value="Modo Administrador" />
          </View>
        </View>
      </ScrollView>
      <View style={styles.detailActions}>
        <Pressable style={styles.editButton}>
          <Text style={styles.editButtonText}>Editar Ficha</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.deleteOutlineButton}>
          <Text style={styles.deleteOutlineText}>Excluir</Text>
        </Pressable>
      </View>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmployeeForm({ onBack }: { onBack: () => void }) {
  return (
    <>
      <AdminBar />
      <Header title="Novo Funcionario" onBack={onBack} close />
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        <FormInput label="Nome Completo" required placeholder="Ex: Camila Soares Santos" focused />
        <FormInput label="E-mail Funcional" required placeholder="Ex: camila.soares@clinica.com.br" />
        <FormInput label="Telefone" required placeholder="Ex: (11) 98888-7777" />
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Cargo / Funcao</Text>
          <View style={styles.selectField}>
            <Text style={styles.selectText}>Fisioterapeuta Dermatofuncional</Text>
            <Ionicons name="chevron-down-outline" size={18} color="#aaaaaa" />
          </View>
        </View>
        <FormInput label="Data de Admissao" placeholder="DD/MM/AAAA" />
        <View style={styles.passwordRow}>
          <FormInput label="Senha" required placeholder="••••••••" password />
          <FormInput label="Confirmar" required placeholder="••••••••" password />
        </View>
      </ScrollView>
      <View style={styles.ctaWrap}>
        <Pressable onPress={onBack} style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Cadastrar Funcionario</Text>
        </Pressable>
      </View>
    </>
  );
}

function FormInput({
  label,
  placeholder,
  required,
  focused,
  password,
}: {
  label: string;
  placeholder: string;
  required?: boolean;
  focused?: boolean;
  password?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={password ? palette.muted : palette.placeholder}
        secureTextEntry={password}
        style={[styles.input, focused && styles.inputFocused, password && styles.passwordInput]}
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
        <Text style={styles.sheetBody}>Tem certeza que deseja excluir este funcionario?</Text>
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
  background: "#f0eef6",
  adminBg: "#ede9f8",
  adminBorder: "#d8d0f0",
  title: "#3b2a6e",
  primary: "#5b3fa6",
  button: "#7c3fbf",
  text: "#1c1c1e",
  label: "#3a3a3a",
  gold: "#c9a227",
  border: "#e8e4f0",
  placeholder: "#c0bcc8",
  muted: "#b0aab8",
  softText: "#888888",
  faint: "#aaaaaa",
  avatar: "#e8e2f5",
  danger: "#d94040",
};

const fontFamily = Platform.select({
  web: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  default: undefined,
});

const styles = StyleSheet.create({
  routeBackground: {
    flex: 1,
    alignItems: "center",
    backgroundColor: palette.background,
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
  adminBar: {
    backgroundColor: palette.adminBg,
    borderBottomWidth: 1,
    borderBottomColor: palette.adminBorder,
    paddingVertical: 8,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adminShield: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  adminText: {
    fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: palette.primary,
    letterSpacing: 0.8,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 8,
    paddingHorizontal: 20,
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
    fontSize: 27,
    lineHeight: 30,
    color: palette.primary,
    fontWeight: "500",
  },
  title: {
    fontFamily,
    margin: 0,
    fontSize: 26,
    fontWeight: "700",
    color: palette.title,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: palette.button,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "300",
  },
  searchWrap: {
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBox: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchText: {
    fontFamily,
    color: palette.muted,
    fontSize: 15,
  },
  employeeList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  employeeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: palette.avatar,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily,
    fontSize: 14,
    fontWeight: "600",
    color: palette.primary,
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  employeeName: {
    fontFamily,
    fontSize: 15,
    fontWeight: "700",
    color: palette.text,
  },
  statusBadge: {
    backgroundColor: "#e6f7ed",
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  statusBadgeAway: {
    backgroundColor: "#f2eddf",
  },
  statusText: {
    fontFamily,
    fontSize: 11,
    fontWeight: "600",
    color: "#2d9a4e",
  },
  statusTextAway: {
    color: "#7a6a44",
  },
  employeeRole: {
    fontFamily,
    fontSize: 13,
    fontWeight: "500",
    color: palette.gold,
    marginBottom: 2,
  },
  employeeEmail: {
    fontFamily,
    fontSize: 12,
    color: palette.softText,
  },
  chevron: {
    fontFamily,
    color: "#cccccc",
    fontSize: 18,
  },
  countWrap: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  countText: {
    fontFamily,
    fontSize: 13,
    color: palette.faint,
  },
  detailScroll: {
    flex: 1,
  },
  detailContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontFamily,
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  profileTitleWrap: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  profileName: {
    fontFamily,
    fontSize: 20,
    fontWeight: "800",
    color: palette.title,
  },
  profileRole: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: palette.gold,
  },
  divider: {
    height: 1,
    backgroundColor: "#ece8f3",
    marginBottom: 14,
  },
  infoList: {
    gap: 12,
  },
  infoLabel: {
    fontFamily,
    fontSize: 11,
    fontWeight: "700",
    color: palette.faint,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily,
    fontSize: 15,
    color: palette.text,
  },
  detailActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: palette.background,
  },
  editButton: {
    flex: 1,
    backgroundColor: palette.button,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  editButtonText: {
    fontFamily,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteOutlineButton: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: palette.danger,
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
  },
  deleteOutlineText: {
    fontFamily,
    color: palette.danger,
    fontSize: 16,
    fontWeight: "700",
  },
  formHeader: {
    paddingTop: 20,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  formHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  closeIcon: {
    fontFamily,
    fontSize: 18,
    color: palette.title,
    fontWeight: "500",
  },
  formTitle: {
    fontFamily,
    fontSize: 24,
    fontWeight: "800",
    color: palette.title,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingTop: 8,
    paddingHorizontal: 20,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontFamily,
    fontSize: 13,
    fontWeight: "600",
    color: palette.label,
    marginBottom: 6,
  },
  required: {
    color: "#e03e3e",
  },
  input: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily,
    fontSize: 15,
    color: palette.text,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: palette.gold,
  },
  passwordInput: {
    fontSize: 18,
    letterSpacing: 3,
  },
  selectField: {
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: {
    fontFamily,
    fontSize: 15,
    color: palette.label,
  },
  passwordRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  ctaWrap: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 28,
    backgroundColor: palette.background,
  },
  ctaButton: {
    width: "100%",
    padding: 18,
    backgroundColor: palette.button,
    borderRadius: 18,
    alignItems: "center",
  },
  ctaButtonText: {
    fontFamily,
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 16,
  },
  deleteIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fde8e8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  deleteX: {
    fontFamily,
    fontSize: 35,
    lineHeight: 36,
    color: palette.danger,
    fontWeight: "300",
  },
  sheetTitle: {
    fontFamily,
    marginBottom: 10,
    fontSize: 20,
    fontWeight: "700",
    color: palette.text,
    textAlign: "center",
  },
  sheetBody: {
    fontFamily,
    marginBottom: 4,
    fontSize: 15,
    color: "#555555",
    textAlign: "center",
    lineHeight: 22.5,
  },
  sheetNote: {
    fontFamily,
    marginBottom: 20,
    fontSize: 13,
    color: palette.faint,
    textAlign: "center",
  },
  sheetActions: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.background,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelText: {
    fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: palette.title,
  },
  deleteButton: {
    flex: 1,
    padding: 16,
    backgroundColor: palette.danger,
    borderRadius: 14,
    alignItems: "center",
  },
  deleteText: {
    fontFamily,
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
