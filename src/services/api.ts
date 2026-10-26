import axios, { AxiosInstance } from "axios";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// fábrica: quando integrar o ms de ordem de serviço (8081), é só criar outra instância
function criarClienteHttp(baseURL: string): AxiosInstance {

  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: { "Content-Type": "application/json" },
  });

  // injeta o JWT em toda requisição
  client.interceptors.request.use((config) => {
    if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
    return config;
  });

  // token inválido/expirado → desloga (o login em si pode dar 401 normalmente)
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const ehLogin = error.config?.url?.includes("/usuarios/login");
      if (axios.isAxiosError(error) && error.response?.status === 401 && !ehLogin) {
        onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const baseURL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

export const api = criarClienteHttp(baseURL);

// microsserviço de ordens de serviço (8081): mesmo token e mesmo tratamento de 401 da API principal
const ordensBaseURL =
  process.env.EXPO_PUBLIC_ORDERS_API_URL ||
  process.env.EXPO_PUBLIC_ORDEM_SERVICO_API_URL ||
  "http://localhost:8081";

export const ordemServicoApi = criarClienteHttp(ordensBaseURL);

// transforma qualquer erro do axios numa mensagem pronta pra mostrar no toast
export function getErrorMessage(
  error: unknown,
  porStatus: Partial<Record<number, string>> = {}
): string {
  if (!axios.isAxiosError(error)) return "Ocorreu um erro inesperado.";

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return "O servidor demorou para responder. Tente novamente.";
  }
  if (!error.response) {
    return "Não foi possível conectar ao servidor. Verifique a rede e o endereço da API.";
  }

  const { status, data } = error.response;
  if (porStatus[status]) return porStatus[status]!;

  const mensagemApi = extrairMensagem(data);
  if (mensagemApi.trim()) return mensagemApi;

  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Registro não encontrado.";
  if (status === 400) return "Dados inválidos. Confira os campos.";
  if (status >= 500) return "Erro no servidor. Tente novamente em instantes.";
  return "Não foi possível concluir a operação.";
}

// a API principal responde { message } (ou { errors: [...] } na validação); o microsserviço de OS responde { erro }
function extrairMensagem(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const corpo = data as { message?: unknown; erro?: unknown; detail?: unknown; errors?: unknown };
  const validacao = Array.isArray(corpo.errors)
    ? corpo.errors
        .map((e) => (e && typeof e === "object" ? (e as { defaultMessage?: unknown }).defaultMessage : e))
        .filter((m): m is string => typeof m === "string" && m.trim() !== "")
        .join("\n")
    : "";
  for (const candidato of [corpo.erro, corpo.message, corpo.detail]) {
    if (typeof candidato === "string" && candidato.trim()) return validacao ? `${candidato}\n${validacao}` : candidato;
  }
  return validacao;
}
