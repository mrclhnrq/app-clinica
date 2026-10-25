// Chamadas da jornada de mensagens/lembretes à API principal (Spring Boot).
// Usa o cliente `api` (axios) de services/api.ts: ele já envia o token JWT do login
// e trata sessão expirada (401) do mesmo jeito que o resto do app.
import { api, getErrorMessage } from "@/services/api";

const CLINICA = "default";

async function request(config) {
  try {
    const { data } = await api.request(config);
    return data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

// Lista os lembretes. O backend monta os lembretes a partir das ordens de serviço
// (horário = OS futura pendente; retorno = OS de retorno pendente).
export function listReminders(page = 0, size = 50) {
  return request({ url: "/lembretes", method: "GET", params: { page, size, clinicaId: CLINICA } });
}

export function getReminder(id) {
  return request({ url: `/lembretes/${id}`, method: "GET", params: { clinicaId: CLINICA } });
}

// Gera a sugestão de mensagem com a IA (OpenAI) a partir dos dados do lembrete/OS.
// Não envia nada: o texto volta para revisão no app.
export function generateReminderMessage(id) {
  return request({ url: `/lembretes/${id}/gerar`, method: "POST", params: { clinicaId: CLINICA } });
}

// Registra o envio com o texto revisado. A resposta traz o whatsappUrl
// (https://wa.me/NUMERO?text=MENSAGEM) que o app abre no WhatsApp.
export function sendReminder(id, conteudo) {
  return request({
    url: `/lembretes/${id}/enviar`,
    method: "POST",
    params: { canal: "WHATSAPP", clinicaId: CLINICA },
    data: { canal: "WHATSAPP", conteudo },
  });
}

export function cancelReminder(id) {
  return request({ url: `/lembretes/${id}/cancelar`, method: "PATCH", params: { clinicaId: CLINICA } });
}

export function listMessageHistory(page = 0, size = 20) {
  return request({
    url: "/lembretes/historico/mensagens",
    method: "GET",
    params: { page, size, clinicaId: CLINICA },
  });
}
