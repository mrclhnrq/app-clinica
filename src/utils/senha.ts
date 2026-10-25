// política de senha (mesma regra do backend: UsuarioService.validarForcaSenha)
export const SENHA_MIN = 8;
export const SENHA_MAX = 20;

export const REGRAS_SENHA = [
  { id: "tamanho", label: `Mínimo de ${SENHA_MIN} caracteres`, test: (s: string) => s.length >= SENHA_MIN },
  { id: "maiuscula", label: "1 letra maiúscula", test: (s: string) => /[A-Z]/.test(s) },
  { id: "minuscula", label: "1 letra minúscula", test: (s: string) => /[a-z]/.test(s) },
  { id: "numero", label: "1 número", test: (s: string) => /\d/.test(s) },
  { id: "especial", label: "1 caractere especial", test: (s: string) => /[^A-Za-z\d]/.test(s) },
] as const;

export type NivelSenha = 0 | 1 | 2 | 3 | 4; // 0 = vazio, 4 = forte

export type ForcaSenha = {
  nivel: NivelSenha;
  rotulo: string;
  valida: boolean;
  regras: { id: string; label: string; ok: boolean }[];
};

const ROTULOS = ["", "Fraca", "Média", "Boa", "Forte"] as const;

export function avaliarSenha(senha: string): ForcaSenha {
  const regras = REGRAS_SENHA.map((r) => ({ id: r.id, label: r.label, ok: r.test(senha) }));
  const atendidas = regras.filter((r) => r.ok).length;
  const valida = atendidas === REGRAS_SENHA.length && senha.length <= SENHA_MAX;

  let nivel: NivelSenha;
  if (!senha) nivel = 0;
  else if (valida) nivel = 4; // "Forte" só quando cumpre toda a política
  else if (atendidas >= 4) nivel = 3;
  else if (atendidas === 3) nivel = 2;
  else nivel = 1;

  return { nivel, rotulo: ROTULOS[nivel], valida, regras };
}
