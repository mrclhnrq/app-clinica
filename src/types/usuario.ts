// cargos possíveis no banco (enum Role do backend)
export type Role = "ADMIN" | "USER";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  USER: "Funcionário",
};

export function roleLabel(role: string | null | undefined): string {
  return ROLE_LABELS[toRole(role)];
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
  fotoPerfil: string | null; // data URI (data:image/jpeg;base64,...)
};

export type UsuarioInput = {
  nome: string;
  email: string;
  telefone: string;
  // undefined = não mexe na foto · "" = remove · data URI = nova foto
  fotoPerfil?: string;
};
