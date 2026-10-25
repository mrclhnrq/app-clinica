// cargos possíveis no banco (enum Role do backend)
export type Role = "ADMIN" | "USER";

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "USER", label: "Funcionário" },
];

export function roleLabel(role: string | null | undefined): string {
  return ROLE_OPTIONS.find((o) => o.value === role)?.label ?? "Funcionário";
}

export function toRole(role: string | null | undefined): Role {
  return role?.toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  role: Role;
};

export type UsuarioInput = {
  nome: string;
  email: string;
  telefone: string;
  role: Role;
};
