import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView,
  StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { Button } from "@/components/Button";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ScreenFooter } from "@/components/ScreenFooter";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SearchInput } from "@/components/SearchInput";
import { SeletorItensModal, type OpcaoSeletor } from "@/components/SeletorItensModal";
import { Tag } from "@/components/Tag";
import { useToast } from "@/components/ToastProvider";
import { OrderDateTimePicker } from "@/components/ordens/OrderDateTimePicker";
import { SeletorUnicoModal } from "@/components/ordens/SeletorUnicoModal";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import {
  deleteOrder, emptyRelations, getOrder, isCombo, isProduct, itemName, itemTotals, listOrders, loadOrderRelations,
  nowTime, orderPayload, orderRelationsError, orderStatusLabels, orderTotals, saveOrder, toDateInput,
  toDateTimeInput, updateOrderStatus, type OrderItem, type OrderPayload, type OrderRelations, type OrderStatus,
  type ServiceOrder,
} from "@/services/ordens";
import { toRole } from "@/types/usuario";

type Screen = "list" | "detail" | "form";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Não foi possível concluir a operação.");
const normalize = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
function formatDate(iso?: string | null) {
  if (!iso) return "Não informado";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia} ${MESES[Number(mes) - 1] ?? mes} ${ano}`;
}
const formatTime = (iso?: string | null) => (iso && iso.length >= 16 ? iso.slice(11, 16) : "");

const STATUS_CORES: Record<OrderStatus, { bg: string; text: string }> = {
  PENDENTE: { bg: "#FFF5E0", text: colors.gold },
  EM_ANDAMENTO: { bg: colors.primaryLight, text: colors.primary },
  CONCLUIDA: { bg: colors.successLight, text: colors.success },
  CANCELADA: { bg: colors.dangerLight, text: colors.danger },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const cor = STATUS_CORES[status] ?? STATUS_CORES.PENDENTE;
  return (
    <View style={[styles.badge, { backgroundColor: cor.bg }]}>
      <Text style={[styles.badgeText, { color: cor.text }]}>{orderStatusLabels[status] ?? "Pendente"}</Text>
    </View>
  );
}

const clientName = (order: ServiceOrder, relations: OrderRelations) =>
  relations.clients.find((c) => c.id === order.clienteId)?.nomeCompleto ?? `Cliente #${order.clienteId}`;

export default function OrdensScreen() {
  const { user } = useAuth();
  const admin = toRole(user?.role) === "ADMIN";
  const { showToast } = useToast();

  const [screen, setScreen] = useState<Screen>("list");
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const [editing, setEditing] = useState(false);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [relations, setRelations] = useState<OrderRelations>(emptyRelations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "cancel" | null>(null);
  const lock = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    const [orderResult, relatedResult] = await Promise.allSettled([
      listOrders(signal),
      loadOrderRelations({ admin, signal }),
    ]);
    if (signal?.aborted) return;
    if (relatedResult.status === "fulfilled") setRelations(relatedResult.value);
    if (orderResult.status === "fulfilled") setOrders(orderResult.value);
    else setError(errorMessage(orderResult.reason));
    setLoading(false);
  }, [admin]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]));

  // executa uma ação por vez (evita toque duplo enquanto a API responde)
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const open = (order: ServiceOrder) => run(async () => {
    const [atual, dados] = await Promise.all([getOrder(order.id), loadOrderRelations({ admin, order })]);
    setRelations(dados);
    setSelected(atual);
    setScreen("detail");
  });

  const startNew = () => run(async () => {
    setRelations(await loadOrderRelations({ admin })); // listas sempre atualizadas ao criar
    setSelected(null);
    setEditing(false);
    setScreen("form");
  });

  function startEdit() {
    if (!selected || busy) return;
    setEditing(true);
    setScreen("form");
  }

  async function save(payload: OrderPayload) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const saved = await saveOrder(payload, editing && selected ? selected.id : undefined);
      setSelected(saved);
      setScreen("detail");
      showToast(editing ? "Ordem de serviço atualizada." : "Ordem de serviço criada.");
      void refresh();
    } catch (e) {
      showToast(errorMessage(e), "error"); // continua no formulário com os dados preenchidos
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const changeStatus = (status: OrderStatus) => run(async () => {
    if (!selected) return;
    // retorno antigo cadastrado sem horário: registra a hora atual ao iniciar ou cancelar
    const semHorario = selected.retorno && selected.dt_hora.slice(11, 19) === "00:00:00"
      && (status === "EM_ANDAMENTO" || status === "CANCELADA");
    const updated = await updateOrderStatus(selected.id, status, semHorario ? `${selected.dt_hora.slice(0, 10)}T${nowTime()}` : undefined);
    setSelected(updated);
    setOrders((atual) => atual.map((o) => (o.id === updated.id ? updated : o)));
    setConfirm(null);
    showToast(`Status atualizado para ${orderStatusLabels[status]}.`);
  });

  const remove = () => run(async () => {
    if (!selected) return;
    await deleteOrder(selected.id);
    setOrders((atual) => atual.filter((o) => o.id !== selected.id));
    setConfirm(null);
    setSelected(null);
    setScreen("list");
    showToast("Ordem de serviço excluída.");
  });

  const back = useCallback(() => {
    if (lock.current) return;
    setScreen((atual) => (atual === "form" && editing ? "detail" : "list"));
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
        <OrderList
          orders={orders}
          relations={relations}
          loading={loading}
          busy={busy}
          error={error || orderRelationsError(relations)}
          onRefresh={() => void refresh()}
          onAdd={() => void startNew()}
          onOpen={(order) => void open(order)}
        />
      )}
      {screen === "detail" && selected && (
        <OrderDetail
          order={selected}
          relations={relations}
          busy={busy}
          onBack={back}
          onEdit={startEdit}
          onAdvance={() => void changeStatus(selected.status === "PENDENTE" ? "EM_ANDAMENTO" : "CONCLUIDA")}
          onCancel={() => setConfirm("cancel")}
          onDelete={() => setConfirm("delete")}
        />
      )}
      {screen === "form" && (
        <OrderForm
          key={editing ? `edit-${selected?.id}` : "new"}
          original={editing ? selected ?? undefined : undefined}
          relations={relations}
          admin={admin}
          currentUser={user ? { id: user.userId, nome: user.nome } : null}
          busy={busy}
          onSave={save}
          onClose={back}
        />
      )}

      <ConfirmModal
        visible={confirm === "delete"}
        title="Confirmar exclusão"
        message="Tem certeza que deseja excluir esta ordem de serviço?"
        warning="Esta ação não pode ser desfeita."
        loading={busy}
        onConfirm={() => void remove()}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        visible={confirm === "cancel"}
        title="Cancelar atendimento"
        message="Deseja cancelar este atendimento?"
        warning="Uma ordem cancelada não pode ser reaberta."
        confirmLabel="Cancelar atendimento"
        cancelLabel="Voltar"
        icon="ban-outline"
        loading={busy}
        onConfirm={() => void changeStatus("CANCELADA")}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

// ===================== Listagem =====================

function OrderList({ orders, relations, loading, busy, error, onRefresh, onAdd, onOpen }: {
  orders: ServiceOrder[]; relations: OrderRelations; loading: boolean; busy: boolean; error: string;
  onRefresh: () => void; onAdd: () => void; onOpen: (order: ServiceOrder) => void;
}) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const termo = normalize(search.trim());
    return orders.filter((order) => normalize(
      `OS #${order.id} ${clientName(order, relations)} ${formatDate(order.dt_hora)} ${orderStatusLabels[order.status] ?? ""}`
    ).includes(termo));
  }, [orders, relations, search]);

  return (
    <>
      <ScreenHeader
        title="Ordens de Serviço"
        right={
          <Pressable
            onPress={onAdd}
            disabled={busy}
            style={[styles.addButton, busy && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Nova ordem de serviço"
          >
            {busy ? <ActivityIndicator color={colors.white} /> : <Ionicons name="add" size={26} color={colors.white} />}
          </Pressable>
        }
      />
      <View style={styles.searchWrap}>
        <SearchInput placeholder="Buscar por cliente, número ou status..." value={search} onChangeText={setSearch} />
      </View>
      <ScrollView
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        {!!error && (
          <Pressable style={styles.errorBox} onPress={onRefresh} accessibilityRole="button">
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}{"\n"}Toque para tentar novamente.</Text>
          </Pressable>
        )}
        {loading && orders.length === 0 && <ActivityIndicator style={styles.loader} color={colors.primary} />}
        {visible.map((order) => (
          <Pressable
            key={order.id}
            disabled={busy}
            onPress={() => onOpen(order)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`OS ${order.id}, ${clientName(order, relations)}, ${orderStatusLabels[order.status]}`}
          >
            <View style={styles.cardHeading}>
              <Text style={styles.orderNumber}>OS #{order.id}</Text>
              <StatusBadge status={order.status} />
            </View>
            <Text style={styles.clientName} numberOfLines={1}>{clientName(order, relations)}</Text>
            <View style={styles.between}>
              <Text style={styles.muted}>
                {formatDate(order.dt_hora || order.dataCriacao)}{formatTime(order.dt_hora) ? ` · ${formatTime(order.dt_hora)}` : ""}
              </Text>
              <Text style={styles.amount}>{money(order.valorFinal)}</Text>
            </View>
            {!!order.dataRetorno && (
              <View style={styles.returnHint}>
                <Ionicons name="repeat-outline" size={14} color={colors.primary} />
                <Text style={styles.returnHintText}>Retorno em {formatDate(order.dataRetorno)}</Text>
              </View>
            )}
          </Pressable>
        ))}
        {!loading && !error && visible.length === 0 && (
          <Text style={styles.empty}>{search.trim() ? "Nenhuma ordem encontrada para a busca." : "Nenhuma ordem de serviço cadastrada."}</Text>
        )}
        {orders.length > 0 && (
          <Text style={styles.counter}>Mostrando {visible.length} de {orders.length} ordens</Text>
        )}
      </ScrollView>
    </>
  );
}

// ===================== Detalhe =====================

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ItemLines({ items, relations }: { items: OrderItem[]; relations: OrderRelations }) {
  if (!items.length) return <Text style={styles.mutedSmall}>Nenhum item.</Text>;
  return (
    <>
      {items.map((item, index) => {
        const totais = itemTotals(item, relations);
        return (
          <View key={index} style={styles.itemLine}>
            <View style={styles.flex}>
              <View style={styles.itemTitleRow}>
                <Text style={styles.itemName}>{itemName(item, relations)}</Text>
                {isCombo(item) && <Tag label="Combo" tone="info" />}
              </View>
              <Text style={styles.mutedSmall}>
                {item.quantidade} × {totais ? money(totais.unitario) : "preço não registrado"}
                {item.desconto ? ` · ${item.desconto}% de desconto` : ""}
              </Text>
            </View>
            <Text style={styles.itemPrice}>{totais ? money(totais.total) : "—"}</Text>
          </View>
        );
      })}
    </>
  );
}

function OrderDetail({ order, relations, busy, onBack, onEdit, onAdvance, onCancel, onDelete }: {
  order: ServiceOrder; relations: OrderRelations; busy: boolean;
  onBack: () => void; onEdit: () => void; onAdvance: () => void; onCancel: () => void; onDelete: () => void;
}) {
  const client = relations.clients.find((c) => c.id === order.clienteId);
  const user = relations.users.find((u) => u.id === order.usuarioId);
  const servicos = order.itens.filter((item) => !isProduct(item));
  const produtos = order.itens.filter(isProduct);
  const totais = orderTotals(order.itens, relations);
  const aberta = order.status === "PENDENTE" || order.status === "EM_ANDAMENTO";

  return (
    <>
      <ScreenHeader title={`Ordem #${order.id}`} onBack={onBack} right={<StatusBadge status={order.status} />} />
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.infoLabel}>CLIENTE</Text>
          <Text style={styles.detailClient}>{client?.nomeCompleto ?? `Cliente #${order.clienteId}`}</Text>
          {!!client?.email && <Text style={styles.mutedSmall}>{client.email}</Text>}

          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Info label="DATA DE CRIAÇÃO" value={formatDate(order.dataCriacao)} />
            <Info label="RESPONSÁVEL" value={user?.nomeCompleto || user?.nome || `Usuário #${order.usuarioId}`} />
          </View>
          <View style={styles.infoRow}>
            <Info label="DATA DO ATENDIMENTO" value={formatDate(order.dt_hora)} />
            <Info label="HORÁRIO" value={formatTime(order.dt_hora) || "Não informado"} />
          </View>
          <View style={styles.infoRow}>
            <Info label="DATA DO RETORNO" value={order.dataRetorno ? formatDate(order.dataRetorno) : "Sem retorno"} />
          </View>
          {order.retorno && <Text style={styles.legacyNote}>Esta ordem foi cadastrada como atendimento de retorno.</Text>}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SERVIÇOS</Text>
          <ItemLines items={servicos} relations={relations} />
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>PRODUTOS</Text>
          <ItemLines items={produtos} relations={relations} />
          <View style={styles.divider} />
          <TotalRow label="Subtotal" value={money(totais.subtotal)} />
          <TotalRow label="Desconto" value={`- ${money(totais.desconto)}`} />
          <TotalRow label="Total da Ordem" value={money(order.valorFinal)} strong />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>OBSERVAÇÕES</Text>
          <Text style={styles.observation}>{order.observacao || "Nenhuma observação cadastrada para esta ordem de serviço."}</Text>
        </View>
      </ScrollView>

      <ScreenFooter>
        <View style={styles.footerColumn}>
          {aberta && (
            <Button
              title={order.status === "PENDENTE" ? "Iniciar Atendimento" : "Concluir Atendimento"}
              onPress={onAdvance}
              loading={busy}
            />
          )}
          <View style={styles.footerRow}>
            <Button title="Editar" variant="secondary" onPress={onEdit} disabled={busy} style={styles.flex} />
            {aberta
              ? <Button title="Cancelar" variant="outlineDanger" onPress={onCancel} disabled={busy} style={styles.flex} />
              : <Button title="Excluir" variant="outlineDanger" onPress={onDelete} disabled={busy} style={styles.flex} />}
            {aberta && (
              <Pressable
                onPress={onDelete}
                disabled={busy}
                style={({ pressed }) => [styles.iconDanger, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Excluir ordem"
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            )}
          </View>
        </View>
      </ScreenFooter>
    </>
  );
}

function TotalRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={[styles.between, styles.totalRow]}>
      <Text style={strong ? styles.totalStrong : styles.totalLabel}>{label}</Text>
      <Text style={strong ? styles.totalStrong : styles.totalValue}>{value}</Text>
    </View>
  );
}

// ===================== Formulário =====================

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function SelectBox({ value, placeholder, icon = "chevron-down", disabled, onPress, accessibilityLabel }: {
  value: string; placeholder: string; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean;
  onPress: () => void; accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.select, disabled && styles.selectDisabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.selectText, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
      <Ionicons name={icon} size={18} color={disabled ? colors.textLight : colors.textMuted} />
    </Pressable>
  );
}

// chave de cada item no seletor: s = serviço, c = combo, p = produto
const itemKey = (item: OrderItem) =>
  isCombo(item) ? `c:${item.comboId}` : isProduct(item) ? `p:${item.produtoId}` : `s:${item.servicoProdutoId}`;

function OrderItemCard({ item, relations, disabled, onChange, onRemove }: {
  item: OrderItem; relations: OrderRelations; disabled: boolean;
  onChange: (item: OrderItem) => void; onRemove: () => void;
}) {
  const [descontoTexto, setDescontoTexto] = useState(item.desconto ? String(item.desconto).replace(".", ",") : "");
  const totais = itemTotals(item, relations);

  function alterarDesconto(texto: string) {
    const limpo = texto.replace(/[^\d,.]/g, "").replace(".", ",");
    setDescontoTexto(limpo);
    const numero = Number(limpo.replace(",", "."));
    onChange({ ...item, desconto: Number.isFinite(numero) ? Math.min(100, Math.max(0, numero)) : 0 });
  }

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.flex}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemName}>{itemName(item, relations)}</Text>
            {isCombo(item) && <Tag label="Combo" tone="info" />}
          </View>
          <Text style={styles.unitPrice}>
            {totais ? `${money(totais.unitario)} un.` : "Preço indisponível"}
          </Text>
        </View>
        <Pressable onPress={onRemove} disabled={disabled} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remover ${itemName(item, relations)}`}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.itemControls}>
        <View style={styles.stepper}>
          <Pressable
            onPress={() => onChange({ ...item, quantidade: Math.max(1, item.quantidade - 1) })}
            disabled={disabled || item.quantidade <= 1}
            style={styles.stepperButton}
            accessibilityRole="button"
            accessibilityLabel="Diminuir quantidade"
          >
            <Ionicons name="remove" size={18} color={item.quantidade <= 1 ? colors.textLight : colors.primary} />
          </Pressable>
          <Text style={styles.stepperValue} accessibilityLabel={`Quantidade ${item.quantidade}`}>{item.quantidade}</Text>
          <Pressable
            onPress={() => onChange({ ...item, quantidade: item.quantidade + 1 })}
            disabled={disabled}
            style={styles.stepperButton}
            accessibilityRole="button"
            accessibilityLabel="Aumentar quantidade"
          >
            <Ionicons name="add" size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.discountBox}>
          <TextInput
            value={descontoTexto}
            onChangeText={alterarDesconto}
            editable={!disabled}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textLight}
            maxLength={5}
            style={styles.discountInput}
            accessibilityLabel="Desconto do item em porcentagem"
          />
          <Text style={styles.discountSuffix}>% desc.</Text>
        </View>

        <Text style={styles.lineTotal}>{totais ? money(totais.total) : "—"}</Text>
      </View>
    </View>
  );
}

function OrderForm({ original, relations, admin, currentUser, busy, onSave, onClose }: {
  original?: ServiceOrder; relations: OrderRelations; admin: boolean;
  currentUser: { id: number; nome: string } | null; busy: boolean;
  onSave: (payload: OrderPayload) => Promise<void>; onClose: () => void;
}) {
  const { showToast } = useToast();
  const [clienteId, setClienteId] = useState(original?.clienteId ?? 0);
  // quem não é administrador registra a OS no próprio nome (a lista de usuários é exclusiva do admin)
  const [usuarioId, setUsuarioId] = useState(original?.usuarioId ?? (admin ? 0 : currentUser?.id ?? 0));
  const [atendimento, setAtendimento] = useState(toDateTimeInput(original?.dt_hora));
  const [precisaRetorno, setPrecisaRetorno] = useState(Boolean(original?.dataRetorno));
  const [dataRetorno, setDataRetorno] = useState(toDateInput(original?.dataRetorno));
  const [observacao, setObservacao] = useState(original?.observacao ?? "");
  const [itens, setItens] = useState<OrderItem[]>(original?.itens ?? []);
  const [seletor, setSeletor] = useState<"cliente" | "responsavel" | "servicos" | "produtos" | null>(null);
  const [calendario, setCalendario] = useState<"atendimento" | "retorno" | null>(null);
  const relationError = orderRelationsError(relations);
  const dataBloqueada = Boolean(original?.retorno); // retorno antigo: backend não deixa mudar a data

  // se a data do atendimento passar a ser depois do retorno, limpa o retorno para não salvar algo inválido
  useEffect(() => {
    const [data] = atendimento.split(" ");
    if (!data || !dataRetorno) return;
    const iso = (d: string) => d.split("/").reverse().join("-");
    if (iso(dataRetorno) <= iso(data)) setDataRetorno("");
  }, [atendimento]); // eslint-disable-line react-hooks/exhaustive-deps

  const totais = orderTotals(itens, relations);
  const servicos = itens.filter((item) => !isProduct(item));
  const produtos = itens.filter(isProduct);

  const clienteNome = relations.clients.find((c) => c.id === clienteId)?.nomeCompleto
    ?? (clienteId ? `Cliente #${clienteId}` : "");
  const responsavel = relations.users.find((u) => u.id === usuarioId);
  const responsavelNome = responsavel?.nomeCompleto || responsavel?.nome
    || (usuarioId === currentUser?.id ? currentUser?.nome : "") || (usuarioId ? `Usuário #${usuarioId}` : "");

  const opcoesServicos: OpcaoSeletor[] = [
    ...relations.catalog.filter((c) => !c.produto).map((c) => ({ id: `s:${c.idProdutoServico}`, label: c.nome, detalhe: money(c.valorVenda) })),
    ...relations.combos.map((c) => ({ id: `c:${c.idCombo}`, label: `${c.nome} (combo)`, detalhe: money(c.valorFinal) })),
  ];
  const opcoesProdutos: OpcaoSeletor[] = relations.catalog
    .filter((c) => c.produto)
    .map((c) => ({ id: `p:${c.idProdutoServico}`, label: c.nome, detalhe: money(c.valorVenda) }));

  // mantém os itens que continuam marcados (com quantidade, desconto e preço) e adiciona os novos
  function confirmarItens(produto: boolean, chaves: string[]) {
    setItens((atual) => {
      const outros = atual.filter((item) => isProduct(item) !== produto);
      const mantidos = atual.filter((item) => isProduct(item) === produto && chaves.includes(itemKey(item)));
      const novos = chaves
        .filter((chave) => !mantidos.some((item) => itemKey(item) === chave))
        .map((chave): OrderItem => {
          const [tipo, id] = chave.split(":");
          const ref = Number(id);
          return tipo === "c" ? { comboId: ref, quantidade: 1, desconto: 0 }
            : tipo === "p" ? { produtoId: ref, quantidade: 1, desconto: 0 }
            : { servicoProdutoId: ref, quantidade: 1, desconto: 0 };
        });
      return produto ? [...outros, ...mantidos, ...novos] : [...mantidos, ...novos, ...outros];
    });
    setSeletor(null);
  }

  function atualizarItem(alvo: OrderItem, novo: OrderItem) {
    setItens((atual) => atual.map((item) => (item === alvo ? novo : item)));
  }

  async function submit() {
    if (busy) return;
    try {
      const payload = orderPayload(
        { clienteId, usuarioId, observacao, itens, atendimento, precisaRetorno, dataRetorno },
        relations,
        original
      );
      await onSave(payload);
    } catch (e) {
      showToast(errorMessage(e), "error");
    }
  }

  const [data, hora] = atendimento.split(" ");

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScreenHeader title={original ? `Editar Ordem #${original.id}` : "Nova Ordem de Serviço"} onBack={onClose} />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        {!!relationError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{relationError}</Text>
          </View>
        )}

        <Field label="Cliente">
          <SelectBox value={clienteNome} placeholder="Selecione o cliente..." onPress={() => setSeletor("cliente")}
            disabled={busy} accessibilityLabel="Selecionar cliente" />
        </Field>

        <Field label="Responsável" hint={admin ? undefined : "A ordem fica registrada no seu nome."}>
          <SelectBox value={responsavelNome} placeholder="Selecione o responsável..." onPress={() => setSeletor("responsavel")}
            disabled={busy || !admin} icon={admin ? "chevron-down" : "lock-closed-outline"} accessibilityLabel="Selecionar responsável" />
        </Field>

        <View style={styles.row}>
          <View style={styles.flex}>
            <Field label="Data do atendimento">
              <SelectBox value={data ?? ""} placeholder="Selecione a data" icon="calendar-outline"
                onPress={() => setCalendario("atendimento")} disabled={busy || dataBloqueada} accessibilityLabel="Selecionar data do atendimento" />
            </Field>
          </View>
          <View style={styles.timeColumn}>
            <Field label="Horário">
              <SelectBox value={hora ?? ""} placeholder="--:--" icon="time-outline"
                onPress={() => setCalendario("atendimento")} disabled={busy || dataBloqueada} accessibilityLabel="Selecionar horário do atendimento" />
            </Field>
          </View>
        </View>
        {dataBloqueada && <Text style={styles.hint}>Retorno antigo: a data cadastrada não pode ser alterada.</Text>}

        <ItemsSection
          title="Serviços"
          hint="Serviços avulsos e combos"
          empty="Nenhum serviço adicionado."
          items={servicos}
          relations={relations}
          busy={busy}
          onAdd={() => setSeletor("servicos")}
          onChange={atualizarItem}
          onRemove={(alvo) => setItens((atual) => atual.filter((item) => item !== alvo))}
        />
        <ItemsSection
          title="Produtos"
          empty="Nenhum produto adicionado."
          items={produtos}
          relations={relations}
          busy={busy}
          onAdd={() => setSeletor("produtos")}
          onChange={atualizarItem}
          onRemove={(alvo) => setItens((atual) => atual.filter((item) => item !== alvo))}
        />

        <View style={styles.returnRow}>
          <View style={styles.flex}>
            <Text style={styles.labelStrong}>Precisa de retorno?</Text>
            <Text style={styles.hint}>A cliente recebe um lembrete perto da data.</Text>
          </View>
          <Switch
            value={precisaRetorno}
            onValueChange={setPrecisaRetorno}
            disabled={busy}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.border}
            {...(Platform.OS === "web" ? { activeThumbColor: colors.white } : {})}
            accessibilityLabel="Precisa de retorno?"
          />
        </View>
        {precisaRetorno && (
          <Field label="Data do retorno">
            <SelectBox value={dataRetorno} placeholder="Selecione a data" icon="calendar-outline"
              onPress={() => setCalendario("retorno")} disabled={busy} accessibilityLabel="Selecionar data do retorno" />
          </Field>
        )}

        <Field label="Observações">
          <TextInput
            multiline
            value={observacao}
            onChangeText={setObservacao}
            editable={!busy}
            maxLength={255}
            placeholder="Ex.: cliente com pele sensível, evitar ácidos..."
            placeholderTextColor={colors.textLight}
            style={styles.textarea}
          />
          <Text style={styles.counterRight}>{observacao.length}/255</Text>
        </Field>
      </ScrollView>

      <ScreenFooter>
        <View style={styles.footerColumn}>
          <View style={styles.between}>
            <View>
              <Text style={styles.totalStrong}>Total</Text>
              {totais.desconto > 0 && (
                <Text style={styles.hint}>Subtotal {money(totais.subtotal)} · desconto {money(totais.desconto)}</Text>
              )}
            </View>
            <Text style={styles.totalStrong}>{money(totais.total)}</Text>
          </View>
          <Button title={original ? "Salvar Ordem" : "Criar Ordem"} onPress={() => void submit()} loading={busy} />
        </View>
      </ScreenFooter>

      <SeletorUnicoModal
        visible={seletor === "cliente"}
        titulo="Selecionar cliente"
        vazio="Nenhum cliente ativo cadastrado."
        opcoes={relations.clients.map((c) => ({ id: c.id, label: c.nomeCompleto, detalhe: c.email ?? undefined }))}
        selecionado={clienteId}
        onSelecionar={(id) => { setClienteId(id); setSeletor(null); }}
        onFechar={() => setSeletor(null)}
      />
      <SeletorUnicoModal
        visible={seletor === "responsavel"}
        titulo="Selecionar responsável"
        vazio="Nenhum usuário encontrado."
        opcoes={relations.users.map((u) => ({ id: u.id, label: u.nomeCompleto || u.nome || `Usuário #${u.id}` }))}
        selecionado={usuarioId}
        onSelecionar={(id) => { setUsuarioId(id); setSeletor(null); }}
        onFechar={() => setSeletor(null)}
      />
      <SeletorItensModal
        visible={seletor === "servicos"}
        titulo="Adicionar serviços e combos"
        vazio="Nenhum serviço ou combo ativo cadastrado."
        opcoes={opcoesServicos}
        selecionados={servicos.map(itemKey)}
        onConfirmar={(chaves) => confirmarItens(false, chaves)}
        onFechar={() => setSeletor(null)}
      />
      <SeletorItensModal
        visible={seletor === "produtos"}
        titulo="Adicionar produtos"
        vazio="Nenhum produto ativo cadastrado."
        opcoes={opcoesProdutos}
        selecionados={produtos.map(itemKey)}
        onConfirmar={(chaves) => confirmarItens(true, chaves)}
        onFechar={() => setSeletor(null)}
      />
      {calendario && (
        <OrderDateTimePicker
          title={calendario === "retorno" ? "Data do retorno" : "Data e horário do atendimento"}
          value={calendario === "retorno" ? dataRetorno : atendimento}
          dateOnly={calendario === "retorno"}
          onConfirm={calendario === "retorno" ? setDataRetorno : setAtendimento}
          onClose={() => setCalendario(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function ItemsSection({ title, hint, empty, items, relations, busy, onAdd, onChange, onRemove }: {
  title: string; hint?: string; empty: string; items: OrderItem[]; relations: OrderRelations; busy: boolean;
  onAdd: () => void; onChange: (alvo: OrderItem, novo: OrderItem) => void; onRemove: (alvo: OrderItem) => void;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.between}>
        <View>
          <Text style={styles.labelStrong}>{title}</Text>
          {!!hint && <Text style={styles.hint}>{hint}</Text>}
        </View>
        <Pressable onPress={onAdd} disabled={busy} style={styles.addItem} accessibilityRole="button" accessibilityLabel={`Adicionar ${title.toLowerCase()}`}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.addItemText}>Adicionar</Text>
        </Pressable>
      </View>
      {items.length === 0
        ? <Text style={styles.emptyItems}>{empty}</Text>
        : items.map((item) => (
          <OrderItemCard
            key={itemKey(item)}
            item={item}
            relations={relations}
            disabled={busy}
            onChange={(novo) => onChange(item, novo)}
            onRemove={() => onRemove(item)}
          />
        ))}
    </View>
  );
}

// ===================== Estilos =====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },

  addButton: { width: 44, height: 44, borderRadius: radius.circle, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  loader: { marginTop: spacing.xl },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg, gap: spacing.xs },
  cardHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  orderNumber: { ...typography.label, fontWeight: "700", color: colors.primary },
  clientName: { ...typography.subtitle, color: colors.text },
  muted: { ...typography.label, color: colors.textMuted },
  mutedSmall: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  amount: { ...typography.body, fontWeight: "700", color: colors.gold },
  returnHint: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  returnHintText: { ...typography.small, color: colors.primary, fontWeight: "600" },
  empty: { ...typography.body, color: colors.textLight, textAlign: "center", marginTop: spacing.xl },
  counter: { ...typography.small, color: colors.textLight, textAlign: "center" },
  errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.dangerLight, borderRadius: radius.sm, padding: spacing.md },
  errorText: { ...typography.label, color: colors.danger, flex: 1 },

  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  detailContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.lg },
  sectionTitle: { fontSize: 11, letterSpacing: 0.5, fontWeight: "700", color: colors.textLight, marginBottom: spacing.sm },
  detailClient: { ...typography.subtitle, color: colors.text, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },
  infoRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  infoCell: { flex: 1 },
  infoLabel: { fontSize: 11, letterSpacing: 0.5, fontWeight: "700", color: colors.textLight },
  infoValue: { ...typography.body, color: colors.text, marginTop: 2 },
  legacyNote: { ...typography.small, color: colors.textMuted, fontStyle: "italic" },
  itemLine: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.xs },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  itemName: { ...typography.body, fontWeight: "600", color: colors.text, flexShrink: 1 },
  itemPrice: { ...typography.body, fontWeight: "600", color: colors.text },
  totalRow: { paddingVertical: 3 },
  totalLabel: { ...typography.body, color: colors.textMuted },
  totalValue: { ...typography.body, color: colors.text },
  totalStrong: { fontSize: 17, fontWeight: "700", color: colors.text },
  observation: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
  footerColumn: { flex: 1, gap: spacing.sm },
  footerRow: { flexDirection: "row", gap: spacing.md },
  iconDanger: { width: 50, borderWidth: 1, borderColor: colors.danger, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },

  formContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  field: { gap: spacing.sm - 2 },
  label: { ...typography.label, color: colors.text },
  labelStrong: { ...typography.body, fontWeight: "600", color: colors.text },
  hint: { ...typography.small, color: colors.textMuted },
  select: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 48,
  },
  selectDisabled: { backgroundColor: colors.neutralLight },
  selectText: { ...typography.body, color: colors.text, flex: 1 },
  placeholder: { color: colors.textLight },
  timeColumn: { width: 120 },
  addItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs },
  addItemText: { ...typography.label, fontWeight: "700", color: colors.primary },
  emptyItems: { ...typography.label, color: colors.textLight, paddingVertical: spacing.sm },
  itemCard: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.cardBorder, padding: spacing.md, gap: spacing.md, marginTop: spacing.xs },
  itemHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  unitPrice: { ...typography.label, color: colors.gold, fontWeight: "600", marginTop: 2 },
  itemControls: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepper: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm },
  stepperButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  stepperValue: { ...typography.body, fontWeight: "600", color: colors.text, minWidth: 24, textAlign: "center" },
  discountBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, height: 38 },
  discountInput: { ...typography.body, color: colors.text, width: 40, textAlign: "right", padding: 0 },
  discountSuffix: { ...typography.small, color: colors.textMuted, marginLeft: 2 },
  lineTotal: { ...typography.body, fontWeight: "700", color: colors.text, marginLeft: "auto" },
  returnRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: colors.white,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  textarea: {
    ...typography.body, color: colors.text, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 96, textAlignVertical: "top",
  },
  counterRight: { ...typography.small, color: colors.textLight, textAlign: "right" },
});
