export type OrderItem = {
  servicoProdutoId?: number | null; produtoId?: number | null; comboId?: number | null;
  quantidade: number; desconto: number;
  nomeServicoProduto?: string; nomeCombo?: string; ehProduto?: boolean;
};
export type OrderStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDENTE: "Pendente", EM_ANDAMENTO: "Em Andamento", CONCLUIDA: "Concluída", CANCELADA: "Cancelada",
};
export type OrderSchedule = { dt_hora: string; retorno: boolean };
export type ServiceOrder = OrderSchedule & {
  id: number; clienteId: number; usuarioId: number; valorFinal: number;
  dataCriacao: string; observacao: string | null; itens: OrderItem[];
  status: OrderStatus;
};
export type OrderPayload = Omit<ServiceOrder, "id" | "dataCriacao">;
export type OrderStatusPayload = { status: OrderStatus; dt_hora?: string };
export type OrderClient = { id: number; nomeCompleto: string; email?: string };
export type OrderUser = { id: number; nomeCompleto?: string; nome?: string };
export type OrderCatalogItem = {
  idProdutoServico: number; nome: string; valorVenda: number;
  produto: boolean; ativo: boolean;
};
export type OrderCombo = { idCombo: number; nome: string; valorFinal: number; ativo: boolean };
export type OrderRelations = {
  clients: OrderClient[]; users: OrderUser[]; catalog: OrderCatalogItem[]; combos: OrderCombo[];
  errors?: Partial<Record<"clients" | "users" | "catalog" | "combos", string>>;
};

let getToken: () => string | null | Promise<string | null> = () =>
  typeof window !== "undefined" ? window.sessionStorage?.getItem("token") ?? null : null;

export function setOrdersTokenProvider(provider: typeof getToken) { getToken = provider; }

export async function orderRequest<T>(path: string, method = "GET", body?: OrderPayload | OrderStatusPayload, signal?: AbortSignal, main = false): Promise<T> {
  const token = await getToken();
  if (main && !token) throw new Error("Os dados relacionados exigem uma sessão autenticada. O login mobile atual ainda não fornece token.");
  const base = (main ? process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080"
    : process.env.EXPO_PUBLIC_ORDERS_API_URL || "http://localhost:8081").replace(/\/+$/, "");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener("abort", cancel);
  const timeout = setTimeout(cancel, 15000);
  try {
    const response = await fetch(`${base}${path}`, {
      method, signal: controller.signal,
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const raw = await response.text();
      let message = "";
      try {
        const data = JSON.parse(raw);
        message = typeof data.erro === "string" ? data.erro : typeof data.message === "string" ? data.message : typeof data.detail === "string" ? data.detail : "";
        if (data.errors && typeof data.errors === "object") message += "\n" + Object.values(data.errors).map(value =>
          typeof value === "string" ? value : (value as { defaultMessage?: string })?.defaultMessage || "").filter(Boolean).join("\n");
      } catch { /* Empty and non-JSON error responses use the HTTP fallback. */ }
      const fallback = response.status === 401 ? "Sessão expirada ou inválida. Entre novamente."
        : response.status === 403 ? "Sem permissão para consultar estes dados (a lista de usuários exige administrador)."
        : response.status === 404 ? "Registro não encontrado. Atualize a lista."
        : response.status === 409 ? "Operação recusada por conflito ou vínculo com outros registros."
        : response.status >= 500 ? "Falha no servidor. Consulte a lista antes de repetir a operação."
        : "Verifique os dados informados.";
      throw new Error(`${fallback}${message && response.status < 500 ? `\n${message}` : ""}`);
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error("Tempo de requisição excedido. Consulte a lista antes de repetir a operação.");
    if (error instanceof TypeError) throw new Error("Não foi possível conectar ao backend. Verifique a conexão e as URLs das APIs.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export async function listOrders(signal?: AbortSignal) {
  const orders: ServiceOrder[] = [];
  for (let page = 0; ; page++) {
    const result = await orderRequest<{ content: ServiceOrder[]; totalPages: number }>(`/ordens-servico?page=${page}`, "GET", undefined, signal);
    if (!result || !Array.isArray(result.content) || !Number.isInteger(result.totalPages)) throw new Error("Resposta de ordens inválida.");
    orders.push(...result.content);
    if (page + 1 >= result.totalPages) return orders;
  }
}

export function updateOrderStatus(id: number, status: OrderStatus, dt_hora?: string) {
  return orderRequest<ServiceOrder>(`/ordens-servico/${id}/status`, "PATCH", { status, ...(dt_hora ? { dt_hora } : {}) });
}

export function orderSchedule(value: string, retorno: boolean, original?: ServiceOrder): OrderSchedule {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(value.trim());
  if (!match || (!retorno && match[4] == null)) throw new Error(retorno ? "Informe a data do retorno em DD/MM/AAAA." : "Informe data e hora em DD/MM/AAAA HH:mm.");
  const [, day, month, year, hour = "00", minute = "00", second = "00"] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  if (Number(year) < 1000 || Number(year) > 9999 || !Number.isFinite(date.getTime()) || date.getUTCFullYear() !== Number(year)
    || date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)
    || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) throw new Error("Data ou horário inválido.");
  const dt_hora = `${year}-${month}-${day}T${retorno ? "00:00:00" : `${hour}:${minute}:${second}`}`;
  if (original?.retorno) {
    if (!retorno || original.dt_hora.slice(0, 10) !== dt_hora.slice(0, 10)) throw new Error("A data do retorno não pode ser alterada após o cadastro.");
    return { dt_hora: original.dt_hora, retorno: true };
  }
  if (original && original.retorno !== retorno) throw new Error("A identificação de retorno não pode ser alterada após o cadastro.");
  return { dt_hora, retorno };
}

export async function loadOrderRelations(signal?: AbortSignal, selected?: Pick<ServiceOrder, "clienteId" | "usuarioId">): Promise<OrderRelations> {
  const [clients, users, catalog, combos] = await Promise.allSettled([
    orderRequest<OrderClient[]>("/cliente", "GET", undefined, signal, true),
    orderRequest<OrderUser[]>("/usuarios", "GET", undefined, signal, true),
    orderRequest<OrderCatalogItem[]>("/servico-produto?status=TODOS", "GET", undefined, signal, true),
    orderRequest<OrderCombo[]>("/combo?status=TODOS", "GET", undefined, signal, true),
  ]);
  if (signal?.aborted) throw new Error("Carregamento cancelado.");
  const errors: NonNullable<OrderRelations["errors"]> = {};
  function records<T>(key: keyof typeof errors, result: PromiseSettledResult<T[]>): T[] {
    if (result.status === "fulfilled" && (result.value == null || Array.isArray(result.value))) return result.value ?? [];
    errors[key] = result.status === "rejected" ? result.reason instanceof Error ? result.reason.message : "Falha ao consultar os dados." : "Resposta de catálogo inválida.";
    return [];
  }
  const data: OrderRelations = {
    clients: records("clients", clients), users: records("users", users),
    catalog: records("catalog", catalog), combos: records("combos", combos),
  };
  if (selected) {
    await Promise.all([
      (async () => {
        if (data.clients.some(client => client.id === selected.clienteId)) return;
        try {
          const client = await orderRequest<OrderClient>(`/cliente/${selected.clienteId}`, "GET", undefined, signal, true);
          if (client?.id !== selected.clienteId || typeof client.nomeCompleto !== "string") throw new Error("Cliente vinculado não encontrado na resposta da API.");
          data.clients.push(client);
        } catch (error) {
          if (!errors.clients) errors.clients = error instanceof Error ? error.message : "Não foi possível consultar o cliente vinculado.";
        }
      })(),
      (async () => {
        if (data.users.some(user => user.id === selected.usuarioId)) return;
        try {
          const user = await orderRequest<OrderUser>(`/usuarios/${selected.usuarioId}`, "GET", undefined, signal, true);
          if (user?.id !== selected.usuarioId || (!user.nomeCompleto && !user.nome)) throw new Error("Responsável vinculado não encontrado na resposta da API.");
          data.users.push(user);
        } catch (error) {
          if (!errors.users) errors.users = error instanceof Error ? error.message : "Não foi possível consultar o responsável vinculado.";
        }
      })(),
    ]);
  }
  if (signal?.aborted) throw new Error("Carregamento cancelado.");
  return Object.keys(errors).length ? { ...data, errors } : data;
}

export function orderRelationsError(relations: OrderRelations) {
  const labels = { clients: "Clientes", users: "Responsáveis", catalog: "Serviços/produtos", combos: "Combos" };
  const entries = Object.entries(relations.errors ?? {}) as [keyof typeof labels, string][];
  if (!entries.length) return "";
  if (entries.length === 4 && new Set(entries.map(([, message]) => message)).size === 1) return entries[0][1];
  return entries.map(([key, message]) => `${labels[key]}: ${message}`).join("\n");
}

export function itemCatalog(item: OrderItem, relations: OrderRelations) {
  return relations.catalog.find(entry => entry.idProdutoServico === (item.produtoId ?? item.servicoProdutoId));
}
export function itemName(item: OrderItem, relations: OrderRelations) {
  return itemCatalog(item, relations)?.nome ?? (item.comboId ? relations.combos.find(combo => combo.idCombo === item.comboId)?.nome ?? `Combo #${item.comboId}` : `Item #${item.produtoId ?? item.servicoProdutoId}`);
}

export function orderPayload(clienteId: number, usuarioId: number, notes: string, items: OrderItem[], relations: OrderRelations, original?: ServiceOrder, schedule?: OrderSchedule): OrderPayload {
  if (!schedule?.dt_hora) throw new Error("Informe a data e o horário do atendimento.");
  const validId = (id: number) => Number.isInteger(id) && id > 0 && id <= 2147483647;
  if (!validId(clienteId) || (clienteId !== original?.clienteId && !relations.clients.some(client => client.id === clienteId))) throw new Error("Selecione um cliente válido. Carregue a lista de clientes para alterar o vínculo.");
  if (!validId(usuarioId) || (usuarioId !== original?.usuarioId && !relations.users.some(user => user.id === usuarioId))) throw new Error("Selecione um responsável válido. Carregue a lista de responsáveis para alterar o vínculo.");
  if (notes.length > 255) throw new Error("Observações devem ter até 255 caracteres.");
  const seen = new Set<string>();
  for (const item of items) {
    const ids = [item.servicoProdutoId, item.produtoId, item.comboId].filter(id => id != null);
    if (ids.length !== 1 || !validId(ids[0]!)) throw new Error("Selecione um item válido.");
    const key = `${item.comboId ? "combo" : item.produtoId ? "produto" : "servico"}:${ids[0]}`;
    if (seen.has(key)) throw new Error("Item duplicado. Use a quantidade do item.");
    seen.add(key);
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1 || item.quantidade > 2147483647) throw new Error("Quantidade deve ser um inteiro positivo.");
    if (!Number.isFinite(item.desconto) || item.desconto < 0 || item.desconto > 100) throw new Error("Desconto deve estar entre 0 e 100%.");
  }
  const unchanged = original && JSON.stringify(items) === JSON.stringify(original.itens);
  let valorFinal = original?.valorFinal ?? 0;
  if (!unchanged) {
    let cents = 0;
    for (const item of items) {
      const entry = itemCatalog(item, relations);
      const combo = relations.combos.find(combo => combo.idCombo === item.comboId);
      const price = combo?.valorFinal ?? entry?.valorVenda;
      if (price == null || !Number.isFinite(price) || price < 0) throw new Error("Não é possível calcular este item com o catálogo atual. Preserve os itens originais.");
      if (entry && entry.produto !== Boolean(item.produtoId)) throw new Error("Tipo de item incompatível com o catálogo.");
      if (!(combo?.ativo ?? entry?.ativo)) throw new Error("Selecione somente serviços e produtos ativos.");
      cents += Math.round(price * 100 * item.quantidade * (1 - item.desconto / 100));
    }
    valorFinal = cents / 100;
  }
  if (!Number.isFinite(valorFinal) || valorFinal < 0 || valorFinal > 3.4028234663852886e38) throw new Error("Valor total inválido.");
  return { clienteId, usuarioId, valorFinal, observacao: notes.trim(), ...schedule, status: original?.status ?? "PENDENTE", itens: items.map(item => {
    const entry = itemCatalog(item, relations);
    const combo = relations.combos.find(combo => combo.idCombo === item.comboId);
    return { ...item, ...(entry ? { nomeServicoProduto: entry.nome.slice(0, 200), ehProduto: entry.produto } : {}), ...(combo ? { nomeCombo: combo.nome.slice(0, 200) } : {}) };
  }) };
}
