import { Platform } from "react-native";

const defaultBaseUrl = Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl;

// Token JWT do backend. É preenchido pelo login() ou, para testes locais,
// pela variável EXPO_PUBLIC_API_TOKEN (token obtido no POST /usuarios/login).
let authToken = process.env.EXPO_PUBLIC_API_TOKEN || null;

export function setAuthToken(token) {
  authToken = token || null;
}

export function getAuthToken() {
  return authToken;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });

  const rawBody = await response.text();
  let body = null;
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = { message: rawBody };
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Sessão expirada ou não autenticada. Faça login novamente.");
    }
    const message = body?.message || body?.error || `Erro ${response.status} ao acessar a API`;
    throw new Error(message);
  }

  return body;
}

export async function login(email, senha) {
  const body = await request("/usuarios/login", {
    method: "POST",
    body: JSON.stringify({ email, senha }),
  });
  setAuthToken(body?.token);
  return body;
}

export function listReminders(page = 0, size = 50) {
  return request(`/lembretes?page=${page}&size=${size}&clinicaId=default`);
}

export function getReminder(id) {
  return request(`/lembretes/${id}?clinicaId=default`);
}

// Gera a sugestão de mensagem com a IA (OpenAI) a partir dos dados do lembrete/OS.
// Não envia nada: o texto volta para revisão no app.
export function generateReminderMessage(id) {
  return request(`/lembretes/${id}/gerar?clinicaId=default`, { method: "POST" });
}

// Registra o envio com o texto revisado. A resposta traz o whatsappUrl
// (https://wa.me/NUMERO?text=MENSAGEM) que o app abre no WhatsApp.
export function sendReminder(id, conteudo) {
  return request(`/lembretes/${id}/enviar?canal=WHATSAPP&clinicaId=default`, {
    method: "POST",
    body: JSON.stringify({ canal: "WHATSAPP", conteudo }),
  });
}

export function cancelReminder(id) {
  return request(`/lembretes/${id}/cancelar?clinicaId=default`, {
    method: "PATCH",
  });
}

export function listMessageHistory(page = 0, size = 20) {
  return request(`/lembretes/historico/mensagens?page=${page}&size=${size}&clinicaId=default`);
}
