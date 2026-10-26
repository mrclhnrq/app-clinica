export type Employee = {
  idFuncionario: number;
  nome: string;
  CPF: string;
  telefone: string;
  email: string;
  descricao: string;
};

export type EmployeeFormValues = {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  descricao: string;
  senha: string;
  confirmarSenha: string;
};

type EmployeePayload = Omit<EmployeeFormValues, "confirmarSenha" | "senha"> & { senha?: string };

// o AuthContext liga este provider ao token do login (getAuthToken do api.ts)
let getToken: () => string | null | Promise<string | null> = () => null;

export function setEmployeesTokenProvider(provider: typeof getToken) {
  getToken = provider;
}

export function validCpf(value: string) {
  if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(value)) return false;
  const cpf = value.replace(/\D/g, "");
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const digit = (sum * 10) % 11 % 10;
    if (digit !== Number(cpf[length])) return false;
  }
  return true;
}

export function employeePayload(values: EmployeeFormValues, editing: boolean): EmployeePayload {
  const nome = values.nome.trim();
  const email = values.email.trim();
  const telefone = values.telefone.trim();
  const descricao = values.descricao.trim();
  const cpf = values.cpf.trim();
  if (nome.length < 3 || nome.length > 150) throw new Error("Nome deve ter entre 3 e 150 caracteres.");
  if (!validCpf(cpf)) throw new Error("Informe um CPF válido.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new Error("Informe um e-mail válido (até 255 caracteres).");
  }
  if (telefone.length < 8 || telefone.length > 20 || !/^[+\d\s().-]+$/.test(telefone) || telefone.replace(/\D/g, "").length < 8) {
    throw new Error("Informe um telefone válido com 8 a 20 caracteres.");
  }
  if (!descricao || descricao.length > 255) throw new Error("Descrição é obrigatória e deve ter até 255 caracteres.");
  const payload: EmployeePayload = { nome, email, telefone, descricao, cpf: cpf.replace(/\D/g, "") };
  if (!editing || values.senha || values.confirmarSenha) {
    if (values.senha.length > 20 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(values.senha)) {
      throw new Error("Senha deve ter de 8 a 20 caracteres, com maiúscula, minúscula, número e caractere especial.");
    }
    if (values.senha !== values.confirmarSenha) throw new Error("A confirmação da senha deve ser igual à senha.");
    payload.senha = values.senha;
  }
  return payload;
}

export async function employeeRequest<T>(path = "", method = "GET", body?: EmployeePayload, signal?: AbortSignal): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error("Funcionários exige uma sessão de administrador. Entre novamente.");
  const baseUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", cancel);
  const timeout = setTimeout(cancel, 15000);
  try {
    const response = await fetch(`${baseUrl}/funcionarios${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) {
      const fallback = response.status === 401 ? "Sessão expirada ou inválida. Entre novamente."
        : response.status === 403 ? "Apenas administradores podem gerenciar funcionários."
        : response.status === 404 ? "Operação não concluída. O backend retornou 404; o funcionário pode não existir ou a alteração ter sido recusada."
        : response.status === 409 ? "Não foi possível concluir: dados duplicados ou funcionário vinculado a outros registros."
        : response.status >= 500 ? "O servidor não conseguiu concluir a operação. Consulte a lista antes de tentar novamente."
        : "Não foi possível concluir a operação. Verifique os dados informados.";
      const data = await response.json().catch(() => null);
      const errors = Array.isArray(data?.errors) ? data.errors
        .filter((error: { defaultMessage?: unknown }) => typeof error?.defaultMessage === "string")
        .map((error: { field?: string; defaultMessage: string }) => `${error.field || "Campo"}: ${error.defaultMessage}`).join("\n") : "";
      throw new Error([fallback, errors || (response.status < 500 && typeof data?.message === "string" ? data.message : "")].filter(Boolean).join("\n"));
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (controller.signal.aborted) throw new Error("A requisição excedeu 15 segundos. Consulte a lista antes de repetir a operação.");
    if (error instanceof TypeError) throw new Error("Não foi possível conectar ao backend. Verifique a conexão e EXPO_PUBLIC_API_URL.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

export function employeeCpf(employee: Employee) {
  return employee.CPF ?? (employee as Employee & { cpf?: string }).cpf ?? "";
}

export function ensureUniqueEmployee(payload: EmployeePayload, employees: Employee[], currentId?: number) {
  if (employees.some(employee => employee.idFuncionario !== currentId &&
    (employee.email?.trim().toLowerCase() === payload.email.toLowerCase() || employeeCpf(employee).replace(/\D/g, "") === payload.cpf))) {
    throw new Error("Já existe um funcionário com este e-mail ou CPF.");
  }
}
