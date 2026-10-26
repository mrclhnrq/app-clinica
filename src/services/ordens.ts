import type { GenericAbortSignal } from "axios";
import { api, getErrorMessage, ordemServicoApi } from "@/services/api";

// ===== Tipos (formato do microsserviço de OS) =====

export type OrderItem = {
  servicoProdutoId?: number | null;
  produtoId?: number | null;
  comboId?: number | null;
  quantidade: number;
  desconto: number; // % por item, de 0 a 100
  // gravados na OS: nome e preço do momento do atendimento (histórico, não acompanham o catálogo)
  nomeServicoProduto?: string | null;
  nomeCombo?: string | null;
  ehProduto?: boolean | null;
  valorUnitario?: number | null;
};

export type OrderStatus = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em Andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export type ServiceOrder = {
  id: number;
  clienteId: number;
  usuarioId: number;
  valorFinal: number;
  dataCriacao: string;
  observacao: string | null;
  itens: OrderItem[];
  status: OrderStatus;
  dt_hora: string; // data e horário do atendimento (AAAA-MM-DDTHH:mm:ss)
  dataRetorno: string | null; // "Precisa de retorno?": data prevista para a cliente voltar (AAAA-MM-DD)
  retorno: boolean; // marcação antiga ("esta OS é um retorno"); OS novas sempre false
};

export type OrderPayload = Omit<ServiceOrder, "id" | "dataCriacao">;

export type OrderClient = { id: number; nomeCompleto: string; email?: string | null };
export type OrderUser = { id: number; nomeCompleto?: string | null; nome?: string | null };
export type OrderCatalogItem = { idProdutoServico: number; nome: string; valorVenda: number; produto: boolean };
export type OrderCombo = { idCombo: number; nome: string; valorFinal: number };
export type OrderRelations = {
  clients: OrderClient[];
  users: OrderUser[];
  catalog: OrderCatalogItem[];
  combos: OrderCombo[];
  errors?: Partial<Record<"clients" | "users" | "catalog" | "combos", string>>;
};

export const emptyRelations: OrderRelations = { clients: [], users: [], catalog: [], combos: [] };

// ===== Chamadas à API =====

const porStatus = {
  403: "Você não tem permissão para esta ação.",
  404: "Ordem de serviço não encontrada. Atualize a lista.",
};

async function chamar<T>(requisicao: Promise<{ data: T }>): Promise<T> {
  try {
    return (await requisicao).data;
  } catch (error) {
    throw new Error(getErrorMessage(error, porStatus));
  }
}

export async function listOrders(signal?: GenericAbortSignal): Promise<ServiceOrder[]> {
  const orders: ServiceOrder[] = [];
  for (let page = 0; ; page++) {
    const result = await chamar(
      ordemServicoApi.get<{ content: ServiceOrder[]; totalPages: number }>("/ordens-servico", { params: { page }, signal })
    );
    if (!result || !Array.isArray(result.content)) throw new Error("Resposta de ordens inválida.");
    orders.push(...result.content.map(normalizarOrdem));
    if (page + 1 >= (result.totalPages ?? 1)) return orders;
  }
}

export async function getOrder(id: number): Promise<ServiceOrder> {
  return normalizarOrdem(await chamar(ordemServicoApi.get<ServiceOrder>(`/ordens-servico/${id}`)));
}

export async function saveOrder(payload: OrderPayload, id?: number): Promise<ServiceOrder> {
  const requisicao = id
    ? ordemServicoApi.put<ServiceOrder>(`/ordens-servico/${id}`, payload)
    : ordemServicoApi.post<ServiceOrder>("/ordens-servico", payload);
  return normalizarOrdem(await chamar(requisicao));
}

export async function deleteOrder(id: number): Promise<void> {
  await chamar(ordemServicoApi.delete(`/ordens-servico/${id}`));
}

export async function updateOrderStatus(id: number, status: OrderStatus, dt_hora?: string): Promise<ServiceOrder> {
  const corpo = { status, ...(dt_hora ? { dt_hora } : {}) };
  return normalizarOrdem(await chamar(ordemServicoApi.patch<ServiceOrder>(`/ordens-servico/${id}/status`, corpo)));
}

function normalizarOrdem(order: ServiceOrder): ServiceOrder {
  return {
    ...order,
    itens: Array.isArray(order.itens) ? order.itens : [],
    dataRetorno: order.dataRetorno ?? null,
    retorno: Boolean(order.retorno),
    valorFinal: Number(order.valorFinal) || 0,
  };
}

// 204 (lista vazia) chega sem corpo
const lista = <T,>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

type CatalogDto = { idProdutoServico: number; nome: string; valorVenda: number; isProduto?: boolean; produto?: boolean };

/**
 * Carrega os dados para montar/exibir uma OS. Para criar, só cadastros ATIVOS entram nas listas.
 * A lista de responsáveis (/usuarios) é exclusiva do administrador; os demais registram a OS
 * no próprio nome. Cliente e responsável de uma OS existente são buscados à parte quando não
 * estão na lista (ex.: cliente inativado depois do atendimento).
 */
export async function loadOrderRelations(
  opcoes: { admin: boolean; signal?: GenericAbortSignal; order?: Pick<ServiceOrder, "clienteId" | "usuarioId"> }
): Promise<OrderRelations> {
  const { admin, signal, order } = opcoes;
  const [clients, users, catalog, combos] = await Promise.allSettled([
    chamar(api.get("/cliente", { params: { status: "ATIVO" }, signal })).then((d) => lista<OrderClient>(d)),
    admin ? chamar(api.get("/usuarios", { signal })).then((d) => lista<OrderUser>(d)) : Promise.resolve([] as OrderUser[]),
    chamar(api.get("/servico-produto", { params: { status: "ATIVO" }, signal })).then((d) =>
      lista<CatalogDto>(d).map((item) => ({
        idProdutoServico: item.idProdutoServico,
        nome: item.nome,
        valorVenda: Number(item.valorVenda) || 0,
        produto: Boolean(item.isProduto ?? item.produto),
      }))
    ),
    chamar(api.get("/combo", { params: { status: "ATIVO" }, signal })).then((d) =>
      lista<OrderCombo>(d).map((c) => ({ idCombo: c.idCombo, nome: c.nome, valorFinal: Number(c.valorFinal) || 0 }))
    ),
  ]);

  const errors: NonNullable<OrderRelations["errors"]> = {};
  function valor<T>(chave: keyof typeof errors, resultado: PromiseSettledResult<T[]>): T[] {
    if (resultado.status === "fulfilled") return resultado.value;
    errors[chave] = resultado.reason instanceof Error ? resultado.reason.message : "Falha ao consultar os dados.";
    return [];
  }
  const data: OrderRelations = {
    clients: valor("clients", clients),
    users: valor("users", users),
    catalog: valor("catalog", catalog),
    combos: valor("combos", combos),
  };

  if (order) {
    await Promise.all([
      data.clients.some((c) => c.id === order.clienteId)
        ? null
        : chamar(api.get<OrderClient>(`/cliente/${order.clienteId}`, { signal }))
            .then((c) => { if (c?.id === order.clienteId) data.clients.push(c); })
            .catch(() => undefined),
      data.users.some((u) => u.id === order.usuarioId)
        ? null
        : chamar(api.get<OrderUser>(`/usuarios/${order.usuarioId}`, { signal }))
            .then((u) => { if (u?.id === order.usuarioId) data.users.push(u); })
            .catch(() => undefined), // sem permissão: mostra "Usuário #id"
    ]);
  }
  return Object.keys(errors).length ? { ...data, errors } : data;
}

export function orderRelationsError(relations: OrderRelations) {
  const labels = { clients: "Clientes", users: "Responsáveis", catalog: "Serviços e produtos", combos: "Combos" };
  const entries = Object.entries(relations.errors ?? {}) as [keyof typeof labels, string][];
  if (!entries.length) return "";
  if (new Set(entries.map(([, message]) => message)).size === 1) return entries[0][1];
  return entries.map(([key, message]) => `${labels[key]}: ${message}`).join("\n");
}

// ===== Itens e valores =====

export const isCombo = (item: OrderItem) => item.comboId != null;
export const isProduct = (item: OrderItem) => item.produtoId != null;

export function itemCatalog(item: OrderItem, relations: OrderRelations) {
  const id = item.produtoId ?? item.servicoProdutoId;
  return id == null ? undefined : relations.catalog.find((entry) => entry.idProdutoServico === id);
}

function itemCombo(item: OrderItem, relations: OrderRelations) {
  return item.comboId == null ? undefined : relations.combos.find((combo) => combo.idCombo === item.comboId);
}

export function itemName(item: OrderItem, relations: OrderRelations) {
  if (isCombo(item)) return item.nomeCombo || itemCombo(item, relations)?.nome || `Combo #${item.comboId}`;
  return item.nomeServicoProduto || itemCatalog(item, relations)?.nome || `Item #${item.produtoId ?? item.servicoProdutoId}`;
}

/** Preço unitário: o gravado na OS; se a OS é antiga e não tem, o preço atual do catálogo. */
export function itemUnitPrice(item: OrderItem, relations: OrderRelations): number | null {
  if (item.valorUnitario != null) return Number(item.valorUnitario);
  const atual = isCombo(item) ? itemCombo(item, relations)?.valorFinal : itemCatalog(item, relations)?.valorVenda;
  return atual == null ? null : Number(atual);
}

const centavos = (valor: number) => Math.round(valor * 100);

export function itemTotals(item: OrderItem, relations: OrderRelations) {
  const unitario = itemUnitPrice(item, relations);
  if (unitario == null) return null;
  const bruto = centavos(unitario * item.quantidade);
  const liquido = centavos(unitario * item.quantidade * (1 - item.desconto / 100));
  return { unitario, bruto: bruto / 100, desconto: (bruto - liquido) / 100, total: liquido / 100 };
}

/** Subtotal (sem desconto), soma dos descontos por item e total da OS. */
export function orderTotals(items: OrderItem[], relations: OrderRelations) {
  let bruto = 0;
  let liquido = 0;
  let semPreco = 0;
  for (const item of items) {
    const totais = itemTotals(item, relations);
    if (!totais) { semPreco++; continue; }
    bruto += centavos(totais.bruto);
    liquido += centavos(totais.total);
  }
  return { subtotal: bruto / 100, desconto: (bruto - liquido) / 100, total: liquido / 100, semPreco };
}

// ===== Datas =====

const pad = (valor: number) => String(valor).padStart(2, "0");

/** "DD/MM/AAAA HH:mm" → "AAAA-MM-DDTHH:mm:00" */
export function parseDateTime(texto: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(texto.trim());
  if (!match) throw new Error("Informe a data e o horário do atendimento.");
  const [, dia, mes, ano, hora, minuto] = match;
  validarData(Number(ano), Number(mes), Number(dia));
  if (Number(hora) > 23 || Number(minuto) > 59) throw new Error("Horário do atendimento inválido.");
  return `${ano}-${mes}-${dia}T${hora}:${minuto}:00`;
}

/** "DD/MM/AAAA" → "AAAA-MM-DD" */
export function parseDate(texto: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!match) throw new Error("Informe a data do retorno.");
  const [, dia, mes, ano] = match;
  validarData(Number(ano), Number(mes), Number(dia));
  return `${ano}-${mes}-${dia}`;
}

function validarData(ano: number, mes: number, dia: number) {
  const data = new Date(ano, mes - 1, dia, 12);
  if (ano < 1000 || ano > 9999 || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
    throw new Error("Data inválida.");
  }
}

/** "AAAA-MM-DDTHH:mm:ss" → "DD/MM/AAAA HH:mm" */
export function toDateTimeInput(iso?: string | null) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano} ${iso.slice(11, 16) || "00:00"}`;
}

/** "AAAA-MM-DD" → "DD/MM/AAAA" */
export function toDateInput(iso?: string | null) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function nowTime() {
  const agora = new Date();
  return `${pad(agora.getHours())}:${pad(agora.getMinutes())}:${pad(agora.getSeconds())}`;
}

// ===== Montagem do envio =====

export type OrderDraft = {
  clienteId: number;
  usuarioId: number;
  observacao: string;
  itens: OrderItem[];
  atendimento: string; // "DD/MM/AAAA HH:mm"
  precisaRetorno: boolean;
  dataRetorno: string; // "DD/MM/AAAA"
};

export function orderPayload(draft: OrderDraft, relations: OrderRelations, original?: ServiceOrder): OrderPayload {
  if (!draft.clienteId) throw new Error("Selecione o cliente.");
  if (!draft.usuarioId) throw new Error("Selecione o responsável pelo atendimento.");
  if (draft.observacao.length > 255) throw new Error("Observações devem ter até 255 caracteres.");
  if (!draft.itens.length) throw new Error("Adicione pelo menos um serviço, combo ou produto.");

  // OS antigas marcadas como retorno mantêm a data cadastrada (regra do backend)
  const dt_hora = original?.retorno ? original.dt_hora : parseDateTime(draft.atendimento);
  let dataRetorno: string | null = null;
  if (draft.precisaRetorno) {
    dataRetorno = parseDate(draft.dataRetorno);
    if (dataRetorno <= dt_hora.slice(0, 10)) throw new Error("A data do retorno deve ser depois da data do atendimento.");
  }

  const itens = draft.itens.map((item) => {
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) throw new Error("A quantidade de cada item deve ser pelo menos 1.");
    if (!Number.isFinite(item.desconto) || item.desconto < 0 || item.desconto > 100) {
      throw new Error("O desconto de cada item deve estar entre 0% e 100%.");
    }
    const valorUnitario = itemUnitPrice(item, relations);
    if (valorUnitario == null) {
      throw new Error(`Não foi possível obter o preço de "${itemName(item, relations)}". Remova o item e adicione de novo.`);
    }
    const nome = itemName(item, relations).slice(0, 200);
    return {
      ...item,
      valorUnitario,
      ...(isCombo(item) ? { nomeCombo: nome } : { nomeServicoProduto: nome, ehProduto: isProduct(item) }),
    };
  });

  return {
    clienteId: draft.clienteId,
    usuarioId: draft.usuarioId,
    observacao: draft.observacao.trim(),
    itens,
    valorFinal: orderTotals(itens, relations).total, // o backend recalcula pelos mesmos itens
    dt_hora,
    dataRetorno,
    retorno: original?.retorno ?? false,
    status: original?.status ?? "PENDENTE",
  };
}
