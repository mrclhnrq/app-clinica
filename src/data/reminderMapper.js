function formatDateTime(dateTime) {
  if (!dateTime) return "Data não informada";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function formatTime(dateTime) {
  if (!dateTime) return "--:--";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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
  return item.tipo !== "LEMBRETE_AGENDAMENTO";
}

export function mapReminder(item) {
  const isReturn = isReturnReminder(item);
  return {
    id: String(item.id),
    backendId: item.id,
    initials: initials(item.nomeCliente),
    name: item.nomeCliente || `Cliente #${item.clienteId}`,
    phone: item.telefone || "Telefone cadastrado no cliente",
    service: isReturn ? "Retorno recomendado" : "Atendimento agendado",
    appointmentDate: formatDateTime(item.dataHora),
    appointmentTime: formatTime(item.dataHora),
    returnDate: isReturn ? formatDateTime(item.dataHora) : undefined,
    historyDate: isReturn ? formatDateTime(item.dataHora) : undefined,
    historyNotes: item.observacao || "Sem observações registradas.",
    status: item.status,
    kind: isReturn ? "retorno" : "horario",
    raw: item,
  };
}

export { isReturnReminder };
