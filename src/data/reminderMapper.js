const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Lê "2026-10-30T14:00:00" ou "2026-10-30" como data local
// (new Date("2026-10-30") seria UTC e mostraria o dia anterior no Brasil).
export function parseLocalDate(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, year, month, day, hour = "0", minute = "0"] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function formatDate(value) {
  const date = parseLocalDate(value);
  if (!date) return "Data não informada";
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatTime(value) {
  const date = parseLocalDate(value);
  if (!date || !/[T ]\d{2}:\d{2}/.test(String(value))) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatPhone(phone) {
  if (!phone) return "Telefone não cadastrado";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

function initials(name) {
  return (name || "Paciente")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function isReturnReminder(item) {
  return item.tipo === "RETORNO";
}

function kindOf(item) {
  if (item.tipo === "RETORNO") return "retorno";
  if (item.tipo === "LEMBRETE_AGENDAMENTO") return "horario";
  return "outro";
}

export function mapReminder(item) {
  const isReturn = isReturnReminder(item);
  return {
    id: String(item.id),
    backendId: item.id,
    initials: initials(item.nomeCliente),
    name: item.nomeCliente || `Cliente #${item.clienteId}`,
    phone: formatPhone(item.telefoneCliente),
    hasPhone: Boolean(item.telefoneCliente && String(item.telefoneCliente).trim()),
    service: item.procedimento || (isReturn ? "Procedimento não informado" : "Atendimento agendado"),
    appointmentDate: formatDate(item.dataHora),
    appointmentTime: formatTime(item.dataHora),
    returnDate: isReturn ? formatDate(item.dataRetornoPrevisto) : undefined,
    historyDate: isReturn ? formatDate(item.dataUltimoAtendimento || item.dataHora) : undefined,
    historyNotes: item.observacao || "Sem observações registradas.",
    status: item.status,
    kind: kindOf(item),
    raw: item,
  };
}

export { isReturnReminder };
