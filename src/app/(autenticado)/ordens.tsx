import { useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { OrderIcon } from "../../components/ordens/OrderIcon";

import { itemCatalog, itemName, listOrders, loadOrderRelations, orderPayload, orderRequest, orderSchedule, orderStatusLabels, updateOrderStatus, orderRelationsError,
  type ServiceOrder, type OrderRelations, type OrderItem, type OrderPayload, type OrderStatus } from "../../services/ordens";

type Screen = "list" | "detail" | "add" | "edit" | "delete";
type Status = "Pendente" | "Em Andamento" | "Concluída" | "Cancelada" | "Não informado";
type Order = ServiceOrder & { client: string; date: string; amount: string; statusLabel: Status };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (value: string) => {
  if (!value) return "Não informado";
  const date = new Date(value.slice(0, 10) + "T12:00:00");
  const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  return `${String(date.getDate()).padStart(2, "0")} ${month.charAt(0).toUpperCase() + month.slice(1)} ${date.getFullYear()}`;
};
const emptyRelations: OrderRelations = { clients: [], users: [], catalog: [], combos: [] };
function notify(message: string) {
  if (Platform.OS === "web") window.alert(message);
  else Alert.alert("Ordens de Serviço", message);
}
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";
const statusColors: Record<Status, { background: string; color: string }> = {
  "Não informado": { background: "#fef8e6", color: "#c8960a" },
  Pendente: { background: "#fef8e6", color: "#c8960a" },
  "Em Andamento": { background: "#e8f0ff", color: "#3a5fd4" },
  Concluída: { background: "#e6f9ee", color: "#2a9d5c" },
  Cancelada: { background: "#fce8e8", color: "#e03535" },
};

function scheduleInput(order?: ServiceOrder) {
  if (!order?.dt_hora) return "";
  const [year, month, day] = order.dt_hora.slice(0, 10).split("-");
  return `${day}/${month}/${year}${order.retorno ? "" : ` ${order.dt_hora.slice(11, 19)}`}`;
}

export default function OrdensScreen() {
  const [screen, setScreen] = useState<Screen>("list");
  const [selected, setSelected] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [relations, setRelations] = useState<OrderRelations>(emptyRelations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [relationError, setRelationError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const back = useCallback(() => { if (!lock.current) setScreen(current => current === "delete" || current === "edit" ? "detail" : "list"); }, []);
  const decorate = useCallback((order: ServiceOrder, data: OrderRelations): Order => ({
    ...order, client: data.clients.find(client => client.id === order.clienteId)?.nomeCompleto ?? ("Cliente #" + order.clienteId),
    date: order.dt_hora ? `${formatDate(order.dt_hora)} · ${order.dt_hora.slice(11, 16)}` : formatDate(order.dataCriacao),
    amount: money(order.valorFinal), statusLabel: (orderStatusLabels[order.status] ?? "Não informado") as Status,
  }), []);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError("");
    const [orderResult, relatedResult] = await Promise.allSettled([listOrders(signal), loadOrderRelations(signal)]);
    if (signal?.aborted) return;
    const data = relatedResult.status === "fulfilled" ? relatedResult.value : emptyRelations;
    setRelations(data);
    setRelationError(relatedResult.status === "rejected" ? errorMessage(relatedResult.reason) : orderRelationsError(data));
    if (orderResult.status === "fulfilled") setOrders(orderResult.value.map(order => decorate(order, data)));
    else setError(errorMessage(orderResult.reason));
    setLoading(false);
  }, [decorate]);
  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]));
  async function open(order: Order, editing = false) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const [result, relatedResult] = await Promise.allSettled([
        orderRequest<ServiceOrder>("/ordens-servico/" + order.id), loadOrderRelations(undefined, order),
      ]);
      if (result.status === "rejected") throw result.reason;
      const data = relatedResult.status === "fulfilled" ? relatedResult.value : relations;
      setRelations(data);
      setRelationError(relatedResult.status === "fulfilled" ? orderRelationsError(data) : errorMessage(relatedResult.reason));
      setSelected(decorate(result.value, data)); setScreen(editing ? "edit" : "detail");
    } catch (error) { notify(errorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(payload: OrderPayload) {
    if (lock.current) throw new Error("Aguarde a operação em andamento e tente salvar novamente.");
    lock.current = true; setBusy(true);
    try {
      const result = await orderRequest<ServiceOrder>(screen === "edit" && selected ? "/ordens-servico/" + selected.id : "/ordens-servico", screen === "edit" ? "PUT" : "POST", payload);
      setSelected(decorate(result, relations)); setScreen("detail");
      notify("Ordem salva com sucesso."); await refresh();
    } catch (error) { notify(errorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function retryRelations() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      const data = await loadOrderRelations(undefined, selected ?? undefined);
      setRelations(data); setRelationError(orderRelationsError(data));
      setOrders(current => current.map(order => decorate(order, data)));
      setSelected(current => current ? decorate(current, data) : null);
    } catch (error) { setRelationError(errorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (lock.current || !selected) return;
    lock.current = true; setBusy(true);
    try {
      await orderRequest("/ordens-servico/" + selected.id, "DELETE");
      setOrders(current => current.filter(order => order.id !== selected.id));
      setSelected(null); setScreen("list"); notify("Ordem excluída com sucesso.");
    } catch (error) { notify(errorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  }

  async function changeStatus(status: OrderStatus, changeTime = false) {
    if (lock.current || !selected) return;
    lock.current = true; setBusy(true);
    try {
      const now = new Date();
      const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map(value => String(value).padStart(2, "0")).join(":");
      const dtHora = changeTime ? `${selected.dt_hora.slice(0, 10)}T${time}` : undefined;
      const result = await updateOrderStatus(selected.id, status, dtHora);
      const updated = decorate(result, relations);
      setSelected(updated); setOrders(current => current.map(order => order.id === updated.id ? updated : order));
    } catch (error) { notify(errorMessage(error)); }
    finally { lock.current = false; setBusy(false); }
  }
  function selectStatus(status: OrderStatus) {
    if (busy || !selected) return;
    if (selected.retorno && selected.dt_hora.slice(11, 19) === "00:00:00" && (status === "EM_ANDAMENTO" || status === "CANCELADA")) {
      const message = "Deseja registrar o horário atual neste retorno? A data cadastrada será preservada.";
      if (Platform.OS === "web") {
        const choice = window.prompt(`${message}\n1: Usar horário atual\n2: Manter 00:00`);
        if (choice === "1" || choice === "2") void changeStatus(status, choice === "1");
      }
      else Alert.alert("Horário do retorno", message, [
        { text: "Voltar", style: "cancel" },
        { text: "Manter 00:00", onPress: () => void changeStatus(status) },
        { text: "Usar horário atual", onPress: () => void changeStatus(status, true) },
      ]);
    } else void changeStatus(status);
  }
  function statusMenu() {
    if (busy || !selected) return;
    if (selected.status !== "PENDENTE" && selected.status !== "EM_ANDAMENTO") return;
    const next: OrderStatus = selected.status === "PENDENTE" ? "EM_ANDAMENTO" : "CONCLUIDA";
    if (Platform.OS === "web") {
      const choice = window.prompt(`1: ${orderStatusLabels[next]}\n2: Cancelar atendimento\nEscolha uma opção:`);
      if (choice === "1") selectStatus(next);
      else if (choice === "2") selectStatus("CANCELADA");
    } else Alert.alert("Atualizar status", "Selecione a ação para esta ordem.", [
      { text: "Voltar", style: "cancel" },
      { text: orderStatusLabels[next], onPress: () => selectStatus(next) },
      { text: "Cancelar atendimento", style: "destructive", onPress: () => selectStatus("CANCELADA") },
    ]);
  }

  function cancelAttendance() {
    if (lock.current || !selected || (selected.status !== "PENDENTE" && selected.status !== "EM_ANDAMENTO")) return;
    const message = "Deseja cancelar este atendimento? A ordem não poderá ser reaberta.";
    if (Platform.OS === "web") {
      if (window.confirm(message)) selectStatus("CANCELADA");
    } else Alert.alert("Cancelar atendimento", message, [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar atendimento", style: "destructive", onPress: () => selectStatus("CANCELADA") },
    ]);
  }

  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "list") return false;
      back();
      return true;
    });
    return () => listener.remove();
  }, [screen, back]));

  return (
    <View style={styles.background}>
      <SafeAreaView edges={["bottom"]} style={[styles.screen, screen === "delete" && styles.dim]}>
        {Platform.OS === "web" && screen !== "delete" && <OrderStatusBar />}
        {screen === "list" && <OrderList
          orders={orders} loading={loading || busy} error={error || relationError} onRetry={() => void refresh()}
          onEdit={order => void open(order, true)} search={search} onSearch={setSearch}
          onAdd={() => { if (!busy) setScreen("add"); }}
          onOpen={order => void open(order)}
        />}
        {screen === "detail" && selected && <OrderDetail relations={relations} busy={busy} order={selected} onBack={back} onDelete={() => setScreen("delete")} onEdit={() => void open(selected, true)} onCancel={cancelAttendance} onStatusMenu={statusMenu} onStart={() => selectStatus(selected.status === "PENDENTE" ? "EM_ANDAMENTO" : "CONCLUIDA")} />}
        {(screen === "add" || screen === "edit") && <OrderForm key={screen + selected?.id} original={screen === "edit" ? selected ?? undefined : undefined} relations={relations} busy={busy} error={relationError} onRetry={retryRelations} onSave={save} onClose={back} />}
        {screen === "delete" && <DeleteSheet busy={busy} onDelete={remove} onCancel={back} />}
      </SafeAreaView>
    </View>
  );
}

function OrderStatusBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <View style={styles.statusBar}>
    <Text style={styles.statusTime}>{now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Text>
    <View style={styles.statusIndicators} accessibilityElementsHidden aria-hidden>
      <Image source={require("../../../assets/images/ordens/signal.svg")} style={{ width: 17, height: 12 }} />
      <Image source={require("../../../assets/images/ordens/wifi.svg")} style={{ width: 16, height: 12 }} />
      <Image source={require("../../../assets/images/ordens/battery.svg")} style={{ width: 25, height: 12 }} />
    </View>
  </View>;
}

function StatusBadge({ status, detail = false, onPress }: { status: Status; detail?: boolean; onPress?: () => void }) {
  const colors = statusColors[status];
  return <View style={[styles.badge, { backgroundColor: colors.background }, detail && styles.detailBadge]}>
    <Text onPress={onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityHint={onPress ? "Atualizar status da ordem" : undefined} style={[styles.badgeText, { color: colors.color }, detail && styles.detailBadgeText]}>
      {detail ? `Status ${status}` : status}
    </Text>
  </View>;
}

function OrderList({ orders, loading, error, onRetry, onEdit, search, onSearch, onAdd, onOpen }: {
  orders: Order[]; loading: boolean; error: string; onRetry: () => void; onEdit: (order: Order) => void;
  search: string; onSearch: (value: string) => void;
  onAdd: () => void; onOpen: (order: Order) => void;
}) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visible = orders.filter(order =>
    normalize(`OS #${order.id} ${order.client} ${order.date} ${order.statusLabel}`).includes(normalize(search.trim()))
  );
  return <>
    <View style={styles.listHeader}>
      <Text accessibilityRole="header" style={styles.title}>Ordens de Serviço</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Nova ordem de serviço" onPress={onAdd} style={styles.addButton}>
        <OrderIcon name="plus" size={22} />
      </Pressable>
    </View>
    <View style={styles.searchWrap}><View style={styles.searchBox}>
      <View style={styles.searchDot} />
      <TextInput accessibilityLabel="Buscar ordens de serviço" placeholder="Buscar ordens de serviço..."
        placeholderTextColor="#b0aabf" value={search} onChangeText={onSearch} style={styles.searchInput} />
    </View></View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
      {(loading || Boolean(error)) && <Text style={styles.empty} onPress={onRetry}>{loading ? "Carregando ordens..." : error + " Toque para tentar novamente."}</Text>}
      {visible.map(order => <Pressable key={order.id} accessibilityRole="button"
        accessibilityLabel={`Abrir OS #${order.id}, ${order.client}, ${order.statusLabel}`} disabled={loading} onPress={() => onOpen(order)} onLongPress={() => onEdit(order)} accessibilityHint="Mantenha pressionado para editar" accessibilityActions={[{ name: "edit", label: "Editar ordem" }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === "edit") onEdit(order); }} style={styles.orderCard}>
        <View style={styles.cardHeading}><Text style={styles.orderNumber}>OS #{order.id}</Text><StatusBadge status={order.statusLabel} /></View>
        <Text style={styles.clientName}>{order.client}</Text>
        <View style={styles.between}><Text style={styles.date}>{order.date}</Text><Text style={styles.amount}>{order.amount}</Text></View>
      </Pressable>)}
      {!loading && !error && visible.length === 0 && <Text style={styles.empty}>Nenhuma ordem encontrada.</Text>}
      <View style={styles.listSpacer} />
    </ScrollView>
  </>;
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return <View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{children}</Text></View>;
}
function Divider() { return <View style={styles.divider} />; }
function ValueRow({ label, value, total = false }: { label: string; value: string; total?: boolean }) {
  return <View style={[styles.between, total && styles.totalRow]}>
    <Text style={total ? styles.total : styles.subtotalLabel}>{label}</Text>
    <Text style={total ? styles.total : styles.price}>{value}</Text>
  </View>;
}

function OrderDetail({ order, relations, busy, onBack, onDelete, onEdit, onCancel, onStart, onStatusMenu }: { order: Order; relations: OrderRelations; busy: boolean; onBack: () => void; onDelete: () => void; onEdit: () => void; onCancel: () => void; onStart: () => void; onStatusMenu: () => void }) {
  const client = relations.clients.find(client => client.id === order.clienteId);
  const user = relations.users.find(user => user.id === order.usuarioId);
  return <ScrollView style={styles.scroll} contentContainerStyle={styles.detailContent}>
    <View style={styles.detailHeader}>
      <View style={styles.detailHeading}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para ordens" onPress={onBack} hitSlop={8}>
          <OrderIcon name="back" size={22} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.detailTitle}>Ordem #{order.id}</Text>
      </View>
      <StatusBadge status={order.statusLabel} detail onPress={onStatusMenu} />
    </View>
    <View style={styles.detailCard}>
      <View style={styles.section}>
        <Text style={styles.infoLabel}>CLIENTE</Text>
        <Text style={[styles.clientName, styles.detailClient]}>{order.client}</Text>
        {Boolean(client?.email) && <Text style={styles.date}>{client?.email}</Text>}
      </View>
      <Divider />
      <View style={styles.infoGrid}>
        <View style={styles.column}><Info label="DATA DO ATENDIMENTO">{order.date}</Info></View>
        <View style={styles.column}><Info label="RESPONSÁVEL">{user?.nomeCompleto || user?.nome || ("Usuário #" + order.usuarioId)}</Info></View>
      </View>
      <View style={styles.section}><Info label="DATA DO RETORNO">{order.retorno ? order.date : "Não se aplica"}</Info></View>
      <Divider />
      <View style={styles.section}>
        <Text style={[styles.infoLabel, styles.itemLabel]}>SERVIÇOS</Text>
        {order.itens.filter(item => !item.produtoId).map((item, index) => <View key={index} style={styles.itemRow}>
          <Text style={styles.itemName}>{itemName(item, relations)} ×{item.quantidade}</Text>
          <Text style={styles.itemPrice}>{item.desconto ? item.desconto + "% desc." : ""}</Text></View>)}
      </View>
      <Divider />
      <View style={styles.section}>
        <Text style={[styles.infoLabel, styles.itemLabel]}>PRODUTOS</Text>
        {order.itens.filter(item => item.produtoId).map((item, index) => <View key={index} style={styles.itemRow}>
          <Text style={styles.itemName}>{itemName(item, relations)} ×{item.quantidade}</Text>
          <Text style={styles.itemPrice}>{item.desconto ? item.desconto + "% desc." : ""}</Text></View>)}
      </View>
      <Divider />
      <View style={styles.totals}>
        <ValueRow label="Subtotal" value="Não informado" />
        <ValueRow label="Desconto" value="Por item" />
        <ValueRow label="Total da Ordem" value={order.amount} total />
      </View>
      <View style={styles.observationDivider} />
      <Text style={[styles.infoLabel, styles.observationLabel]}>OBSERVAÇÕES</Text>
      <Text style={styles.observation}>{order.observacao || "Nenhuma observação cadastrada para esta ordem de serviço."}</Text>
    </View>
    <View style={styles.detailActions}>
      <Pressable accessibilityRole="button" disabled={busy || (order.status !== "PENDENTE" && order.status !== "EM_ANDAMENTO")} onPress={onStart} style={styles.startButton}>
        <Text style={styles.actionText}>{order.status === "PENDENTE" ? "Iniciar Atendimento" : order.status === "EM_ANDAMENTO" ? "Concluir Atendimento" : order.statusLabel}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onDelete} style={styles.deleteOutline}>
        <Text style={styles.deleteOutlineText}>Excluir</Text>
      </Pressable>
    </View>
    <View style={styles.detailActions}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onEdit} style={styles.startButton}>
        <Text style={styles.actionText}>Editar</Text>
      </Pressable>
      {(order.status === "PENDENTE" || order.status === "EM_ANDAMENTO") && <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.deleteOutline}>
        <Text style={styles.deleteOutlineText}>Cancelar atendimento</Text>
      </Pressable>}
    </View>
  </ScrollView>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <View><Text style={styles.label}>{label}</Text>{children}</View>;
}

function DraftItem({ label, name, price, visible, onRemove, onAdd }: {
  label: string; name: string; price: string; visible: boolean; onRemove: () => void; onAdd: () => void;
}) {
  return <View>
    <View style={styles.draftHeading}>
      <Text style={styles.labelInline}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Adicionar ${label.toLowerCase()}`} onPress={onAdd} style={styles.addItem}>
        <OrderIcon name="plusCircle" size={18} /><Text style={styles.addItemText}>Adicionar</Text>
      </Pressable>
    </View>
    {visible && <View style={styles.draftItem}>
      <View style={styles.draftItemInfo}><Text style={styles.draftItemName}>{name}</Text><Text style={styles.draftPrice}>{price}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remover ${name}`} onPress={onRemove} hitSlop={8}>
        <OrderIcon name="trash" size={20} />
      </Pressable>
    </View>}
  </View>;
}

function OrderForm({ original, relations, busy, error, onRetry, onSave, onClose }: { original?: ServiceOrder; relations: OrderRelations; busy: boolean; error: string; onRetry: () => void; onSave: (payload: OrderPayload) => Promise<void>; onClose: () => void }) {
  const [needsReturn, setNeedsReturn] = useState(original?.retorno ?? false);
  const [returnDate, setReturnDate] = useState(() => scheduleInput(original));
  const [notes, setNotes] = useState(original?.observacao ?? "");
  const [clientId, setClientId] = useState(original?.clienteId ?? 0);
  const [userId, setUserId] = useState(original?.usuarioId ?? 0);
  const [items, setItems] = useState<OrderItem[]>(original?.itens ?? []);
  const [picker, setPicker] = useState<"client" | "user" | "service" | "product" | null>(null);
  const submitting = useRef(false);
  function add(id: number, combo = false) {
    if (combo) {
      setItems(current => current.some(item => item.comboId === id)
        ? current.map(item => item.comboId === id ? { ...item, quantidade: item.quantidade + 1 } : item)
        : [...current, { comboId: id, quantidade: 1, desconto: 0 }]);
      setPicker(null);
      return;
    }
    const entry = relations.catalog.find(item => item.idProdutoServico === id)!;
    setItems(current => {
      const existing = current.findIndex(item => (entry.produto ? item.produtoId : item.servicoProdutoId) === id);
      return existing >= 0 ? current.map((item, index) => index === existing ? { ...item, quantidade: item.quantidade + 1 } : item)
        : [...current, { ...(entry.produto ? { produtoId: id } : { servicoProdutoId: id }), quantidade: 1, desconto: 0 }];
    });
    setPicker(null);
  }
  async function submit() {
    if (busy || submitting.current) return;
    submitting.current = true;
    try {
      await onSave(orderPayload(clientId, userId, notes, items, relations, original, orderSchedule(returnDate, needsReturn, original)));
    } catch (error) { notify(errorMessage(error)); }
    finally { submitting.current = false; }
  }
  const options: { id: number; name: string; combo?: boolean }[] = picker === "client" ? relations.clients.map(item => ({ id: item.id, name: item.nomeCompleto }))
    : picker === "user" ? relations.users.map(item => ({ id: item.id, name: item.nomeCompleto || item.nome || ("Usuário #" + item.id) }))
    : [...relations.catalog.filter(item => item.ativo && item.produto === (picker === "product")).map(item => ({ id: item.idProdutoServico, name: item.nome + " — " + money(item.valorVenda) })),
      ...(picker === "service" ? relations.combos.filter(item => item.ativo).map(item => ({ id: item.idCombo, name: item.nome + " — " + money(item.valorFinal), combo: true })) : [])];
  function togglePicker(value: typeof picker) { if (!busy) setPicker(current => current === value ? null : value); }
  function choices(kind: typeof picker) {
    return picker === kind && <View>{options.length === 0 && <Text style={styles.empty}>Nenhum registro disponível.</Text>}{options.map(option =>
      <Pressable key={String(option.combo) + option.id} disabled={busy} style={styles.select} onPress={() => {
        if (kind === "client") { setClientId(option.id); setPicker(null); }
        else if (kind === "user") { setUserId(option.id); setPicker(null); }
        else add(option.id, option.combo);
      }}><Text style={styles.placeholder}>{option.name}</Text></Pressable>)}</View>;
  }
  return <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.formHeader}>
      <Text accessibilityRole="header" style={styles.title}>{original ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar nova ordem" onPress={onClose} style={styles.closeButton}>
        <OrderIcon name="close" size={16} />
      </Pressable>
    </View>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
      {Boolean(error) && <Text style={styles.empty} onPress={busy ? undefined : onRetry}>{error} Toque para tentar novamente.</Text>}
      <Field label="Cliente"><Pressable accessibilityRole="button" accessibilityLabel="Selecione o cliente"
        onPress={() => togglePicker("client")} style={styles.select}>
        <Text style={styles.placeholder}>{relations.clients.find(client => client.id === clientId)?.nomeCompleto || (clientId ? `Cliente #${clientId}` : "Selecione o cliente...")}</Text><OrderIcon name="chevron" size={18} />
      </Pressable></Field>
      {choices("client")}
      <Field label="Funcionário"><Pressable accessibilityRole="button" accessibilityLabel="Selecione o funcionário"
        onPress={() => togglePicker("user")} style={styles.select}>
        <Text style={styles.placeholder}>{relations.users.find(user => user.id === userId)?.nomeCompleto || relations.users.find(user => user.id === userId)?.nome || (userId ? `Responsável #${userId}` : "Selecione o funcionário...")}</Text><OrderIcon name="chevron" size={18} />
      </Pressable></Field>
      {choices("user")}
      {([false, true] as const).map(product => <View key={String(product)}>
        <DraftItem label={product ? "Produtos" : "Serviços"} name="" price="" visible={false} onRemove={() => {}} onAdd={() => togglePicker(product ? "product" : "service")} />
        {choices(product ? "product" : "service")}
        {items.map((item, index) => Boolean(item.produtoId) === product && <View key={index} style={styles.draftItem}>
          <View style={styles.draftItemInfo}><Text style={styles.draftItemName}>{itemName(item, relations)} ×{item.quantidade}</Text>
            <Text style={styles.draftPrice}>{itemCatalog(item, relations) ? money(itemCatalog(item, relations)!.valorVenda) : "Preço histórico não disponível"}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={"Remover " + itemName(item, relations)} disabled={busy} onPress={() => setItems(current => current.filter((_, position) => position !== index))} hitSlop={8}><OrderIcon name="trash" size={20} /></Pressable>
        </View>)}
      </View>)}
      <View style={styles.between}>
        <Text style={styles.returnLabel}>Atendimento de retorno?</Text>
        <Pressable accessibilityRole="switch" accessibilityLabel="Atendimento de retorno?" accessibilityState={{ checked: needsReturn, disabled: busy || !!original }} disabled={busy || !!original}
          onPress={() => setNeedsReturn(value => !value)} style={[styles.toggle, !needsReturn && styles.toggleOff]}>
          <View style={[styles.toggleKnob, !needsReturn && styles.toggleKnobOff]} />
        </Pressable>
      </View>
      <Field label={needsReturn ? "Data do retorno" : "Data e hora do atendimento"}><View style={styles.select}>
        <TextInput accessibilityLabel={needsReturn ? "Data do retorno" : "Data e hora do atendimento"} placeholder={needsReturn ? "DD/MM/AAAA" : "DD/MM/AAAA HH:mm"} placeholderTextColor={palette.muted}
          editable={!busy && !original?.retorno} value={returnDate} onChangeText={setReturnDate} style={styles.dateInput} />
        <OrderIcon name="calendar" size={20} />
      </View></Field>
      <View style={styles.notesField}><Field label="Observações">
        <TextInput accessibilityLabel="Observações" multiline placeholder="Ex: Paciente possui sensibilidade nos dentes..."
          placeholderTextColor={palette.muted} editable={!busy} maxLength={255} value={notes} onChangeText={setNotes} style={styles.notesInput} />
      </Field></View>
    </ScrollView>
    <View style={styles.createWrap}>
      <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={styles.createButton}>
        <Text style={styles.createText}>{busy ? "Salvando..." : original ? "Salvar Ordem" : "Criar Ordem"}</Text>
      </Pressable>
    </View>
  </KeyboardAvoidingView>;
}

function DeleteSheet({ busy, onDelete, onCancel }: { busy: boolean; onDelete: () => void; onCancel: () => void }) {
  return <View style={styles.sheetScreen} accessibilityViewIsModal>
    <Pressable accessibilityRole="button" accessibilityLabel="Cancelar exclusão" onPress={onCancel} style={StyleSheet.absoluteFill} />
    <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.alertIcon}><OrderIcon name="alertClose" size={28} /></View>
      <Text accessibilityRole="header" style={styles.sheetTitle}>Confirmar exclusão</Text>
      <Text style={styles.sheetBody}>Tem certeza que deseja excluir esta ordem de serviço?</Text>
      <Text style={styles.sheetNote}>Esta ação não pode ser desfeita.</Text>
      <View style={styles.sheetActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onDelete} style={styles.deleteButton}><Text style={styles.deleteText}>Excluir</Text></Pressable>
      </View>
    </View>
  </View>;
}

const palette = { background: "#ededf5", title: "#5b2d8e", primary: "#6a3db8", ink: "#1a1a2e", muted: "#9a98b0", label: "#4a4a6a", border: "#e0dff0", line: "#ebebf5", gold: "#c8960a", danger: "#e03535" };
const fontFamily = Platform.select({ web: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", default: undefined });
const text = { fontFamily, color: palette.ink };
const styles = StyleSheet.create({
  statusBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 14, paddingHorizontal: 24 },
  statusTime: { ...text, fontSize: 15, fontWeight: "600" },
  statusIndicators: { flexDirection: "row", alignItems: "center", gap: 6 },
  background: { flex: 1, alignItems: "center", backgroundColor: palette.background },
  screen: { flex: 1, width: "100%", maxWidth: 360, backgroundColor: palette.background },
  dim: { backgroundColor: "#7a7a7a" },
  scroll: { flex: 1 },

  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 18, paddingHorizontal: 20, paddingBottom: 16 },
  title: { ...text, fontSize: 22, fontWeight: "800", color: palette.title, flexShrink: 1 },
  addButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: palette.primary, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, backgroundColor: "white", paddingVertical: 12, paddingHorizontal: 16 },
  searchDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.muted },
  searchInput: { ...text, flex: 1, minWidth: 0, fontSize: 15, padding: 0 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  orderCard: { backgroundColor: "white", borderRadius: 16, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.05)" },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  orderNumber: { ...text, fontSize: 15, fontWeight: "700", color: palette.title },
  badge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, flexShrink: 0 },
  badgeText: { ...text, fontSize: 12, fontWeight: "700" },
  clientName: { ...text, fontSize: 16, fontWeight: "700", marginBottom: 4 },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { ...text, fontSize: 13, color: palette.muted },
  amount: { ...text, fontSize: 16, fontWeight: "700", color: palette.gold },
  listSpacer: { height: 52 },
  empty: { ...text, fontSize: 14, color: palette.muted, textAlign: "center", paddingVertical: 16 },
  detailContent: { paddingBottom: 10 },
  detailHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12, gap: 4 },
  detailHeading: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  detailTitle: { ...text, fontSize: 20, fontWeight: "800", color: palette.title, flexShrink: 1 },
  detailBadge: { paddingVertical: 5, paddingHorizontal: 14 },
  detailBadgeText: { fontSize: 13 },
  detailCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: "white", borderRadius: 20, padding: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  section: { marginBottom: 14 },
  infoLabel: { ...text, fontSize: 11, fontWeight: "700", color: palette.muted, letterSpacing: 0.5, marginBottom: 3 },
  detailClient: { marginTop: 1, marginBottom: 2 },
  divider: { height: 1, backgroundColor: palette.line, marginBottom: 14 },
  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  column: { flex: 1 },
  infoValue: { ...text, fontSize: 14, fontWeight: "600" },
  itemLabel: { marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemName: { ...text, fontSize: 14, flexShrink: 1 },
  itemPrice: { ...text, fontSize: 14, fontWeight: "600" },
  totals: { gap: 6, marginTop: -2 },
  subtotalLabel: { ...text, fontSize: 14, color: palette.muted },
  price: { ...text, fontSize: 14 },
  totalRow: { marginTop: 4 },
  total: { ...text, fontSize: 15, fontWeight: "700" },
  observationDivider: { height: 1, backgroundColor: palette.line, marginVertical: 12 },
  observationLabel: { marginBottom: 6 },
  observation: { ...text, fontSize: 14, lineHeight: 21, color: palette.muted },
  detailActions: { flexDirection: "row", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  startButton: { flex: 1, backgroundColor: palette.primary, borderRadius: 16, padding: 16, alignItems: "center", justifyContent: "center" },
  actionText: { ...text, fontSize: 15, fontWeight: "700", color: "white", textAlign: "center" },
  deleteOutline: { backgroundColor: "white", borderColor: palette.danger, borderWidth: 2, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18, justifyContent: "center" },
  deleteOutlineText: { ...text, fontSize: 15, fontWeight: "700", color: palette.danger },
  formHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 16, paddingHorizontal: 20, paddingBottom: 12 },
  closeButton: { width: 38, height: 38, backgroundColor: "#e8e0f5", borderRadius: 19, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  formContent: { paddingHorizontal: 20, gap: 14 },
  label: { ...text, fontSize: 14, color: palette.label, marginBottom: 6 },
  labelInline: { ...text, fontSize: 14, color: palette.label },
  select: { backgroundColor: "white", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1.5, borderColor: palette.border },
  placeholder: { ...text, fontSize: 15, color: palette.muted },
  draftHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  addItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  addItemText: { ...text, fontSize: 14, fontWeight: "700", color: palette.primary },
  draftItem: { backgroundColor: "white", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: palette.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  draftItemInfo: { flexShrink: 1 },
  draftItemName: { ...text, fontSize: 15, fontWeight: "700", marginBottom: 2 },
  draftPrice: { ...text, fontSize: 14, fontWeight: "600", color: palette.gold },
  returnLabel: { ...text, fontSize: 14, fontWeight: "500", color: palette.label },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: palette.primary },
  toggleOff: { backgroundColor: palette.border },
  toggleKnob: { width: 22, height: 22, backgroundColor: "white", borderRadius: 11, position: "absolute", top: 3, right: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  toggleKnobOff: { left: 3, right: undefined },
  dateInput: { ...text, flex: 1, minWidth: 0, fontSize: 15, padding: 0 },
  notesField: { marginBottom: 4 },
  notesInput: { ...text, backgroundColor: "white", borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, borderWidth: 1.5, borderColor: palette.border, minHeight: 80, fontSize: 14, textAlignVertical: "top" },
  createWrap: { paddingTop: 14, paddingHorizontal: 20, paddingBottom: 10 },
  createButton: { backgroundColor: "#7b3fc4", borderRadius: 18, padding: 18, alignItems: "center" },
  createText: { ...text, color: "white", fontSize: 17, fontWeight: "700", letterSpacing: 0.2 },
  sheetScreen: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 16, paddingHorizontal: 24, paddingBottom: 36 },
  handle: { alignSelf: "center", width: 40, height: 4, backgroundColor: palette.border, borderRadius: 4, marginBottom: 18 },
  alertIcon: { alignSelf: "center", width: 64, height: 64, borderRadius: 32, backgroundColor: "#fce8e8", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  sheetTitle: { ...text, fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 10 },
  sheetBody: { ...text, fontSize: 15, lineHeight: 22.5, color: palette.label, textAlign: "center", marginBottom: 6 },
  sheetNote: { ...text, fontSize: 14, color: palette.muted, textAlign: "center", marginBottom: 6 },
  sheetActions: { flexDirection: "row", gap: 12, marginTop: 22 },
  cancelButton: { flex: 1, backgroundColor: "#f0eef8", borderRadius: 16, padding: 16, alignItems: "center" },
  cancelText: { ...text, color: palette.title, fontSize: 16, fontWeight: "700" },
  deleteButton: { flex: 1, backgroundColor: palette.danger, borderRadius: 16, padding: 16, alignItems: "center" },
  deleteText: { ...text, color: "white", fontSize: 16, fontWeight: "700" },
});
