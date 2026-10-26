import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchInput } from "@/components/SearchInput";
import { useToast } from "@/components/ToastProvider";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { employeeCpf, employeePayload, employeeRequest, ensureUniqueEmployee, type Employee, type EmployeeFormValues } from "../../services/funcionarios";

type Screen = "list" | "detail" | "add" | "edit" | "delete";

// avisos usam o Toast do app (mesmo padrão das outras telas); sem Toast disponível, cai no alerta nativo
let showToast: ((message: string, type?: "success" | "error") => void) | null = null;
function notify(title: string, message: string) {
  if (showToast) return showToast(message, title === "Sucesso" ? "success" : "error");
  if (Platform.OS === "web") window.alert(`${title}\n${message}`);
  else Alert.alert(title, message);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível concluir a operação.";
}

function initials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

export default function FuncionariosScreen() {
  // nos testes automáticos não existe ToastProvider: aí os avisos usam o alerta nativo
  showToast = typeof useToast === "function" ? useToast().showToast : null;
  const [screen, setScreen] = useState<Screen>("list");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (screen !== "list") return;
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    const timer = setTimeout(() => {
      employeeRequest<Employee[]>(search.trim() ? `?busca=${encodeURIComponent(search.trim())}` : "", "GET", undefined, controller.signal)
        .then(result => { if (!controller.signal.aborted) setEmployees(result); })
        .catch(error => {
          if (!controller.signal.aborted) { setEmployees([]); setListError(errorMessage(error)); }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [screen, search, revision]);

  async function openEmployee(employee: Employee) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      setSelected(await employeeRequest<Employee>(`/${employee.idFuncionario}`));
      setScreen("detail");
    } catch (error) { notify("Erro ao carregar funcionário", errorMessage(error)); }
    finally { pending.current = false; setBusy(false); }
  }

  async function saveEmployee(values: EmployeeFormValues) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const editing = screen === "edit";
      if (editing && !selected) return;
      const payload = employeePayload(values, editing);
      const all = await employeeRequest<Employee[]>();
      ensureUniqueEmployee(payload, all, editing ? selected!.idFuncionario : undefined);
      const saved = await employeeRequest<Employee>(editing ? `/${selected!.idFuncionario}` : "", editing ? "PUT" : "POST", payload);
      setSelected(saved);
      setScreen(editing ? "detail" : "list");
      notify("Sucesso", editing ? "Funcionário atualizado." : "Funcionário cadastrado.");
    } catch (error) { notify("Não foi possível salvar", errorMessage(error)); }
    finally { pending.current = false; setBusy(false); }
  }

  async function deleteEmployee() {
    if (pending.current || !selected) return;
    pending.current = true;
    setBusy(true);
    try {
      await employeeRequest<void>(`/${selected.idFuncionario}`, "DELETE");
      setEmployees(current => current.filter(employee => employee.idFuncionario !== selected.idFuncionario));
      setSelected(null);
      setScreen("list");
      notify("Sucesso", "Funcionário excluído.");
    } catch (error) { notify("Não foi possível excluir", errorMessage(error)); }
    finally { pending.current = false; setBusy(false); }
  }

  return (
    <View style={styles.routeBackground}>
      <SafeAreaView style={[styles.screen, screen === "delete" && styles.dimScreen]}>
        {screen === "list" && (
          <EmployeeList
            employees={employees}
            search={search}
            onSearch={setSearch}
            loading={loading}
            error={listError}
            busy={busy}
            onRetry={() => setRevision(current => current + 1)}
            onAdd={() => setScreen("add")}
            onBack={() => router.push("/home")}
            onOpen={openEmployee}
          />
        )}
        {screen === "detail" && selected && (
          <EmployeeDetail
            employee={selected}
            onEdit={() => setScreen("edit")}
            onBack={() => setScreen("list")}
            onDelete={() => setScreen("delete")}
          />
        )}
        {(screen === "add" || screen === "edit") && <EmployeeForm
          employee={screen === "edit" ? selected : null}
          busy={busy}
          onSave={saveEmployee}
          onBack={() => { if (!pending.current) setScreen(screen === "edit" ? "detail" : "list"); }}
        />}
        {screen === "delete" && (
          <DeleteSheet busy={busy} onCancel={() => setScreen("detail")} onConfirm={deleteEmployee} />
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
  // formulários também usam o cabeçalho padrão (seta de voltar), como "Novo Cliente"
  return <ScreenHeader title={title} onBack={onBack} right={close ? undefined : action} />;
}

function EmployeeList({
  employees, search, onSearch, loading, error, busy, onRetry,
  onAdd,
  onBack,
  onOpen,
}: {
  employees: Employee[];
  search: string;
  onSearch: (value: string) => void;
  loading: boolean;
  error: string;
  busy: boolean;
  onRetry: () => void;
  onAdd: () => void;
  onBack: () => void;
  onOpen: (employee: Employee) => void;
}) {
  return (
    <>
      <AdminBar />
      <Header
        title="Funcionários"
        onBack={onBack}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Novo funcionário" onPress={onAdd} style={styles.addButton}>
            <Ionicons name="add" size={24} color={colors.white} />
          </Pressable>
        }
      />
      <SearchInput containerStyle={styles.search} placeholder="Buscar funcionários..." value={search} onChangeText={onSearch} />
      <View style={styles.employeeList}>
        {!loading && !error && employees.map((employee) => (
          <Pressable key={employee.idFuncionario} disabled={busy} onPress={() => onOpen(employee)} style={styles.employeeCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(employee.nome)}</Text>
            </View>
            <View style={styles.employeeInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.employeeName}>{employee.nome}</Text>
                <View
                  style={[
                    styles.statusBadge,
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                    ]}>
                    Não informado
                  </Text>
                </View>
              </View>
              <Text style={styles.employeeRole}>{employee.descricao}</Text>
              <Text style={styles.employeeEmail}>{employee.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </Pressable>
        ))}
      </View>
      <View style={styles.countWrap}>
        <Text style={styles.countText} onPress={error ? onRetry : undefined} accessibilityRole={error ? "button" : undefined}>
          {loading ? "Carregando funcionários..." : error ? `${error} Toque para tentar novamente.` : busy ? "Carregando ficha..." : `Mostrando ${employees.length} funcionários${search.trim() ? " encontrados" : " cadastrados"}`}
        </Text>
      </View>
    </>
  );
}

function EmployeeDetail({
  employee,
  onEdit,
  onBack,
  onDelete,
}: {
  employee: Employee;
  onEdit: () => void;
  onBack: () => void;
  onDelete: () => void;
}) {

  return (
    <>
      <AdminBar />
      <Header title="Ficha do Funcionário" onBack={onBack} />
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileHead}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initials(employee.nome)}</Text>
            </View>
            <View style={styles.profileTitleWrap}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{employee.nome}</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Não informado</Text>
                </View>
              </View>
              <Text style={styles.profileRole}>{employee.descricao}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoList}>
            <InfoRow label="E-MAIL FUNCIONAL" value={employee.email} />
            <InfoRow label="TELEFONE" value={employee.telefone} />
          </View>
        </View>
      </ScrollView>
      <View style={styles.detailActions}>
        <Pressable onPress={onEdit} style={styles.editButton}>
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

function EmployeeForm({ onBack, onSave, employee, busy }: {
  onBack: () => void;
  onSave: (values: EmployeeFormValues) => void;
  employee: Employee | null;
  busy: boolean;
}) {
  const [values, setValues] = useState<EmployeeFormValues>({
    nome: employee?.nome ?? "", cpf: employee ? employeeCpf(employee) : "",
    email: employee?.email ?? "", telefone: employee?.telefone ?? "",
    descricao: employee?.descricao ?? "", senha: "", confirmarSenha: "",
  });
  function field(key: keyof EmployeeFormValues): TextInputProps {
    return { value: values[key], editable: !busy, onChangeText: value => setValues(current => ({ ...current, [key]: value })) };
  }
  return (
    <>
      <AdminBar />
      <Header title={employee ? "Editar Funcionário" : "Novo Funcionário"} onBack={onBack} close />
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        <FormInput label="Nome Completo" required placeholder="Ex: Camila Soares Santos" focused {...field("nome")} maxLength={150} />
        <FormInput label="CPF" required placeholder="Ex: 000.000.000-00" {...field("cpf")} keyboardType="numeric" maxLength={14} />
        <FormInput label="E-mail Funcional" required placeholder="Ex: camila.soares@clinica.com.br" {...field("email")} autoCapitalize="none" keyboardType="email-address" maxLength={255} />
        <FormInput label="Telefone" required placeholder="Ex: (11) 98888-7777" {...field("telefone")} keyboardType="phone-pad" maxLength={20} />
        <FormInput label="Descrição" required placeholder="Digite a descrição" {...field("descricao")} maxLength={255} />
        <View style={styles.passwordRow}>
          <View style={styles.passwordCol}><FormInput label="Senha" required={!employee} {...field("senha")} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="••••••••" password /></View>
          <View style={styles.passwordCol}><FormInput label="Confirmar" required={!employee} {...field("confirmarSenha")} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="••••••••" password /></View>
        </View>
      </ScrollView>
      <View style={styles.ctaWrap}>
        <Pressable disabled={busy} onPress={() => onSave(values)} style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>{busy ? "Salvando..." : employee ? "Salvar Funcionário" : "Cadastrar Funcionário"}</Text>
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
  ...inputProps
}: TextInputProps & {
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
        {...inputProps}
        placeholder={placeholder}
        placeholderTextColor={password ? palette.muted : palette.placeholder}
        secureTextEntry={password}
        style={[styles.input, focused && styles.inputFocused, password && styles.passwordInput]}
      />
    </View>
  );
}

function DeleteSheet({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.sheetScreen}>
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.deleteIcon}>
          <Ionicons name="close" size={32} color={colors.danger} />
        </View>
        <Text style={styles.sheetTitle}>Confirmar exclusão</Text>
        <Text style={styles.sheetBody}>Tem certeza que deseja excluir este funcionário?</Text>
        <Text style={styles.sheetNote}>Esta ação não pode ser desfeita.</Text>
        <View style={styles.sheetActions}>
          <Pressable disabled={busy} onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable disabled={busy} onPress={onConfirm} style={styles.deleteButton}>
            <Text style={styles.deleteText}>{busy ? "Excluindo..." : "Excluir"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// cores do tema do app (src/constants/theme.ts)
const palette = {
  background: colors.background,
  title: colors.primary,
  primary: colors.primary,
  button: colors.primaryDark,
  text: colors.text,
  label: colors.textMuted,
  gold: colors.gold,
  border: colors.border,
  placeholder: colors.textLight,
  muted: colors.textLight,
  softText: colors.textMuted,
  faint: colors.textLight,
  avatar: colors.primaryLight,
  danger: colors.danger,
};

const styles = StyleSheet.create({
  routeBackground: { flex: 1, backgroundColor: palette.background },
  screen: { flex: 1, width: "100%", backgroundColor: palette.background },
  dimScreen: { backgroundColor: "rgba(0,0,0,0.4)" },
  adminBar: { backgroundColor: colors.primaryLight, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  adminShield: { width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  adminText: { fontSize: 11, fontWeight: "700", color: palette.primary, letterSpacing: 0.8 },
  addButton: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.primaryDark, alignItems: "center", justifyContent: "center" },
  search: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  employeeList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  employeeCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 46, height: 46, borderRadius: radius.circle, backgroundColor: palette.avatar, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "700", color: palette.primary },
  employeeInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 2 },
  employeeName: { ...typography.body, fontWeight: "700", color: palette.text, flexShrink: 1 },
  statusBadge: { backgroundColor: colors.successLight, borderRadius: radius.pill, paddingVertical: 2, paddingHorizontal: spacing.sm },
  statusBadgeAway: { backgroundColor: colors.neutralLight },
  statusText: { fontSize: 11, fontWeight: "700", color: colors.success },
  statusTextAway: { color: colors.textMuted },
  employeeRole: { fontSize: 13, fontWeight: "500", color: palette.gold, marginBottom: 2 },
  employeeEmail: { ...typography.small, color: palette.softText },
  countWrap: { paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, alignItems: "center" },
  countText: { ...typography.small, color: palette.faint },
  detailScroll: { flex: 1 },
  detailContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  profileCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, padding: spacing.lg },
  profileHead: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  profileAvatar: { width: 56, height: 56, borderRadius: radius.circle, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 18, fontWeight: "700", color: colors.white },
  profileTitleWrap: { flex: 1 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 5 },
  profileName: { ...typography.subtitle, fontSize: 20, color: palette.title, flexShrink: 1 },
  profileRole: { fontSize: 13, fontWeight: "600", color: palette.gold },
  divider: { height: 1, backgroundColor: colors.borderLight, marginBottom: 14 },
  infoList: { gap: spacing.md },
  infoLabel: { fontSize: 11, fontWeight: "700", color: palette.faint, letterSpacing: 0.6, marginBottom: 2 },
  infoValue: { ...typography.body, color: palette.text },
  detailActions: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 20, backgroundColor: palette.background },
  editButton: { flex: 1, backgroundColor: palette.button, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  editButtonText: { ...typography.button, fontSize: 15, color: colors.white },
  deleteOutlineButton: { flex: 1, backgroundColor: "transparent", borderColor: palette.danger, borderWidth: 1, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  deleteOutlineText: { ...typography.button, fontSize: 15, color: palette.danger },
  formScroll: { flex: 1 },
  formContent: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg },
  fieldGroup: { marginBottom: 14 },
  label: { ...typography.label, color: palette.label, marginBottom: 6 },
  required: { color: colors.danger },
  input: { width: "100%", backgroundColor: colors.white, borderWidth: 1, borderColor: palette.border, borderRadius: radius.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.md, ...typography.body, color: palette.text },
  inputFocused: { borderColor: colors.primary },
  passwordInput: { fontSize: 18, letterSpacing: 3 },
  passwordRow: { flexDirection: "row", gap: spacing.md, marginBottom: 20 },
  passwordCol: { flex: 1, minWidth: 0 },
  ctaWrap: { paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: 28, backgroundColor: palette.background },
  ctaButton: { width: "100%", paddingVertical: 14, backgroundColor: palette.button, borderRadius: radius.sm, alignItems: "center" },
  ctaButtonText: { ...typography.button, fontSize: 15, color: colors.white },
  sheetScreen: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: spacing.md, paddingHorizontal: spacing.xl - 4, paddingBottom: spacing.xl, alignItems: "center" },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 4, marginBottom: spacing.lg },
  deleteIcon: { width: 64, height: 64, borderRadius: radius.circle, backgroundColor: colors.dangerLight, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  sheetTitle: { ...typography.subtitle, fontSize: 20, marginBottom: 10, color: palette.text, textAlign: "center" },
  sheetBody: { ...typography.body, marginBottom: 4, color: colors.textMuted, textAlign: "center", lineHeight: 22 },
  sheetNote: { fontSize: 13, marginBottom: 20, color: palette.faint, textAlign: "center" },
  sheetActions: { width: "100%", flexDirection: "row", gap: spacing.md },
  cancelButton: { flex: 1, paddingVertical: 14, backgroundColor: colors.primaryLight, borderRadius: radius.sm, alignItems: "center" },
  cancelText: { ...typography.button, fontSize: 15, color: palette.title },
  deleteButton: { flex: 1, paddingVertical: 14, backgroundColor: palette.danger, borderRadius: radius.sm, alignItems: "center" },
  deleteText: { ...typography.button, fontSize: 15, color: colors.white },
});
