import { Platform } from "react-native";

const defaultBaseUrl = Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultBaseUrl;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
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
    const message = body?.message || body?.error || `Erro ${response.status} ao acessar a API`;
    throw new Error(message);
  }

  return body;
}

export function listReminders(page = 0, size = 50) {
  return request(`/lembretes?page=${page}&size=${size}&clinicaId=default`);
}

export function getReminder(id) {
  return request(`/lembretes/${id}?clinicaId=default`);
}

export function sendReminder(id) {
  return request(`/lembretes/${id}/enviar?canal=WHATSAPP&clinicaId=default`, {
    method: "POST",
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
