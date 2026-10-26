import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type TextInputProps,
} from "react-native";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PasswordInput } from "@/components/PasswordInput";
import { ScreenFooter } from "@/components/ScreenFooter";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchInput } from "@/components/SearchInput";
import { useToast } from "@/components/ToastProvider";
import { colors, radius, spacing, typography } from "@/constants/theme";
import {
  employeeCpf, employeePayload, employeeRequest, ensureUniqueEmployee, type Employee, type EmployeeFormValues,
} from "@/services/funcionarios";

type Screen = "list" | "detail" | "form";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Não foi possível concluir a operação.");
const initials = (name: string) =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const asList = (data: unknown): Employee[] => (Array.isArray(data) ? data : []); // 204 chega sem corpo

export default function FuncionariosScreen() {
  const { showToast } = useToast();
  const [screen, setScreen] = useState<Screen>("list");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pending = useRef(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (screen !== "list") return;
    const controller = new AbortController();
    setLoading(true);
    setListError("");
    const timer = setTimeout(() => {
      const busca = search.trim() ? `?busca=${encodeURIComponent(search.trim())}` : "";
      employeeRequest<Employee[]>(busca, "GET", undefined, controller.signal)
        .then((result) => { if (!controller.signal.aborted) setEmployees(asList(result)); })
        .catch((error) => {
          if (!controller.signal.aborted) { setEmployees([]); setListError(errorMessage(error)); }
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [screen, search, revision]);

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      showToast(errorMessage(error), "error");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const openEmployee = (employee: Employee) => run(async () => {
    setSelected(await employeeRequest<Employee>(`/${employee.idFuncionario}`));
    setScreen("detail");
  });

  const saveEmployee = (values: EmployeeFormValues) => run(async () => {
    if (editing && !selected) return;
    const payload = employeePayload(values, editing);
    ensureUniqueEmployee(payload, asList(await employeeRequest<Employee[]>()), editing ? selected!.idFuncionario : undefined);
    const saved = await employeeRequest<Employee>(editing ? `/${selected!.idFuncionario}` : "", editing ? "PUT" : "POST", payload);
    setSelected(saved);
    setScreen(editing ? "detail" : "list");
    showToast(editing ? "Funcionário atualizado." : "Funcionário cadastrado.");
  });

  const deleteEmployee = () => run(async () => {
    if (!selected) return;
    await employeeRequest<void>(`/${selected.idFuncionario}`, "DELETE");
    setEmployees((current) => current.filter((employee) => employee.idFuncionario !== selected.idFuncionario));
    setConfirmDelete(false);
    setSelected(null);
    setScreen("list");
    showToast("Funcionário excluído.");
  });

  const back = useCallback(() => {
    if (pending.current) return;
    setScreen((current) => (current === "form" && editing ? "detail" : "list"));
  }, [editing]);

  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "list") return false;
      back();
      return true;
    });
    return () => listener.remove();
  }, [screen, back]));

  return (
    <View style={styles.container}>
      {screen === "list" && (
        <EmployeeList
          employees={employees}
          search={search}
          onSearch={setSearch}
          loading={loading}
          error={listError}
          busy={busy}
          onRetry={() => setRevision((current) => current + 1)}
          onAdd={() => { setEditing(false); setScreen("form"); }}
          onBack={() => router.back()}
          onOpen={(employee) => void openEmployee(employee)}
        />
      )}
      {screen === "detail" && selected && (
        <EmployeeDetail
          employee={selected}
          busy={busy}
          onEdit={() => { setEditing(true); setScreen("form"); }}
          onBack={back}
          onDelete={() => setConfirmDelete(true)}
        />
      )}
      {screen === "form" && (
        <EmployeeForm
          key={editing ? `edit-${selected?.idFuncionario}` : "new"}
          employee={editing ? selected : null}
          busy={busy}
          onSave={(values) => void saveEmployee(values)}
          onBack={back}
        />
      )}
      <ConfirmModal
        visible={confirmDelete}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir este funcionário?"
        warning="Esta ação não pode ser desfeita."
        loading={busy}
        onConfirm={() => void deleteEmployee()}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function AdminBar() {
  return (
    <View style={styles.adminBar}>
      <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
      <Text style={styles.adminText}>MODO ADMINISTRADOR</Text>
    </View>
  );
}

function EmployeeList({ employees, search, onSearch, loading, error, busy, onRetry, onAdd, onBack, onOpen }: {
  employees: Employee[]; search: string; onSearch: (value: string) => void; loading: boolean; error: string;
  busy: boolean; onRetry: () => void; onAdd: () => void; onBack: () => void; onOpen: (employee: Employee) => void;
}) {
  return (
    <>
      <ScreenHeader
        title="Funcionários"
        onBack={onBack}
        right={
          <Pressable onPress={onAdd} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Novo funcionário">
            <Ionicons name="add" size={26} color={colors.white} />
          </Pressable>
        }
      />
      <AdminBar />
      <View style={styles.searchWrap}>
        <SearchInput placeholder="Buscar funcionários..." value={search} onChangeText={onSearch} />
      </View>
      <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {!!error && (
          <Pressable style={styles.errorBox} onPress={onRetry} accessibilityRole="button">
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}{"\n"}Toque para tentar novamente.</Text>
          </Pressable>
        )}
        {loading && <ActivityIndicator style={styles.loader} color={colors.primary} />}
        {!loading && !error && employees.map((employee) => (
          <Pressable
            key={employee.idFuncionario}
            disabled={busy}
            onPress={() => onOpen(employee)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(employee.nome)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name} numberOfLines={1}>{employee.nome}</Text>
              {!!employee.descricao && <Text style={styles.role} numberOfLines={1}>{employee.descricao}</Text>}
              <Text style={styles.muted} numberOfLines={1}>{employee.email}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
          </Pressable>
        ))}
        {!loading && !error && (
          <Text style={styles.counter}>
            {employees.length === 0
              ? search.trim() ? "Nenhum funcionário encontrado." : "Nenhum funcionário cadastrado."
              : `Mostrando ${employees.length} ${employees.length === 1 ? "funcionário" : "funcionários"}`}
          </Text>
        )}
      </ScrollView>
    </>
  );
}

function EmployeeDetail({ employee, busy, onEdit, onBack, onDelete }: {
  employee: Employee; busy: boolean; onEdit: () => void; onBack: () => void; onDelete: () => void;
}) {
  return (
    <>
      <ScreenHeader title="Ficha do Funcionário" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.sectionCard}>
          <View style={styles.profileHead}>
            <View style={[styles.avatar, styles.avatarLarge]}>
              <Text style={[styles.avatarText, styles.avatarTextLarge]}>{initials(employee.nome)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.profileName}>{employee.nome}</Text>
              {!!employee.descricao && <Text style={styles.role}>{employee.descricao}</Text>}
            </View>
          </View>
          <View style={styles.divider} />
          <InfoRow label="E-MAIL FUNCIONAL" value={employee.email} />
          <InfoRow label="TELEFONE" value={employee.telefone} />
          <InfoRow label="CPF" value={employeeCpf(employee) || "Não informado"} />
        </View>
      </ScrollView>
      <ScreenFooter>
        <Button title="Editar Ficha" onPress={onEdit} disabled={busy} style={styles.flex} />
        <Button title="Excluir" variant="outlineDanger" onPress={onDelete} disabled={busy} style={styles.flex} />
      </ScreenFooter>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmployeeForm({ onBack, onSave, employee, busy }: {
  onBack: () => void; onSave: (values: EmployeeFormValues) => void; employee: Employee | null; busy: boolean;
}) {
  const [values, setValues] = useState<EmployeeFormValues>({
    nome: employee?.nome ?? "", cpf: employee ? employeeCpf(employee) : "",
    email: employee?.email ?? "", telefone: employee?.telefone ?? "",
    descricao: employee?.descricao ?? "", senha: "", confirmarSenha: "",
  });
  function field(key: keyof EmployeeFormValues): TextInputProps {
    return { value: values[key], editable: !busy, onChangeText: (value) => setValues((current) => ({ ...current, [key]: value })) };
  }
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScreenHeader title={employee ? "Editar Funcionário" : "Novo Funcionário"} onBack={onBack} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <FormInput label="Nome completo" required placeholder="Ex.: Camila Soares Santos" {...field("nome")} maxLength={150} />
        <FormInput label="CPF" required placeholder="000.000.000-00" {...field("cpf")} keyboardType="numeric" maxLength={14} />
        <FormInput label="E-mail funcional" required placeholder="camila@clinica.com.br" {...field("email")} autoCapitalize="none" keyboardType="email-address" maxLength={255} />
        <FormInput label="Telefone" required placeholder="(11) 98888-7777" {...field("telefone")} keyboardType="phone-pad" maxLength={20} />
        <FormInput label="Descrição" required placeholder="Ex.: Esteticista" {...field("descricao")} maxLength={255} />
        <View style={styles.field}>
          <Text style={styles.label}>Senha {!employee && <Text style={styles.required}>*</Text>}</Text>
          <PasswordInput {...field("senha")} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="••••••••" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Confirmar senha {!employee && <Text style={styles.required}>*</Text>}</Text>
          <PasswordInput {...field("confirmarSenha")} autoCapitalize="none" autoCorrect={false} maxLength={20} placeholder="••••••••" />
          <Text style={styles.hint}>
            {employee ? "Deixe em branco para manter a senha atual. " : ""}8 a 20 caracteres, com maiúscula, minúscula, número e símbolo.
          </Text>
        </View>
      </ScrollView>
      <ScreenFooter>
        <Button
          title={employee ? "Salvar Funcionário" : "Cadastrar Funcionário"}
          onPress={() => onSave(values)}
          loading={busy}
          style={styles.flex}
        />
      </ScreenFooter>
    </KeyboardAvoidingView>
  );
}

function FormInput({ label, required, ...inputProps }: TextInputProps & { label: string; required?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label} {required && <Text style={styles.required}>*</Text>}</Text>
      <TextInput {...inputProps} placeholderTextColor={colors.textLight} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },

  adminBar: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.primaryLight,
  },
  adminText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: colors.primary },
  addButton: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  loader: { marginTop: spacing.xl },
  errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.dangerLight, borderRadius: radius.sm, padding: spacing.md },
  errorText: { ...typography.label, color: colors.danger, flex: 1 },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg,
  },
  avatar: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "700", color: colors.primary },
  avatarLarge: { width: 64, height: 64 },
  avatarTextLarge: { fontSize: 22 },
  name: { ...typography.subtitle, color: colors.text },
  role: { ...typography.label, color: colors.primary, fontWeight: "600", marginTop: 2 },
  muted: { ...typography.label, color: colors.textMuted, marginTop: 2 },
  counter: { ...typography.small, color: colors.textLight, textAlign: "center", marginTop: spacing.sm },

  detailContent: { padding: spacing.lg, paddingTop: 0 },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg },
  profileHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileName: { ...typography.subtitle, color: colors.text },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
  infoRow: { marginBottom: spacing.md },
  infoLabel: { fontSize: 11, letterSpacing: 0.5, fontWeight: "700", color: colors.textLight },
  infoValue: { ...typography.body, color: colors.text, marginTop: 2 },

  formContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  field: { gap: spacing.sm - 2 },
  label: { ...typography.label, color: colors.text },
  required: { color: colors.danger },
  hint: { ...typography.small, color: colors.textMuted },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md, ...typography.body, color: colors.text, backgroundColor: colors.white,
  },
});
