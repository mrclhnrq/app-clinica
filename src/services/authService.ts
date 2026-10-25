import { api } from "@/services/api";

export type LoginResponse = {
  userId: number;
  nome: string;
  email: string;
  token: string;
  role: string;
};

export async function login(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/usuarios/login", { email, senha });
  return data;
}