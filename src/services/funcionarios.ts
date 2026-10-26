import axios, { type GenericAbortSignal, type Method } from "axios";
import { api, getErrorMessage } from "@/services/api";

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

// usa o cliente `api` (axios): envia o token do login e trata sessão expirada como o resto do app
export async function employeeRequest<T>(path = "", method: Method = "GET", body?: EmployeePayload, signal?: GenericAbortSignal): Promise<T> {
  try {
    const { data } = await api.request<T>({ url: `/funcionarios${path}`, method, data: body, signal });
    return data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    throw new Error(getErrorMessage(error, {
      403: "Apenas administradores podem gerenciar funcionários.",
      404: "Funcionário não encontrado. Atualize a lista.",
      409: "Já existe um funcionário com estes dados ou ele está vinculado a outros registros.",
    }));
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
