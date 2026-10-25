export type Cliente = {
  id: string;
  nome: string;                    // nomeCompleto no backend
  email: string;
  telefone: string;                // formatado: (11) 99999-0000
  cpf: string;                     // formatado: 000.000.000-00
  dataNascimento: string | null;   // ISO (AAAA-MM-DD), opcional
  ativo: boolean;
};

export type ClienteInput = Omit<Cliente, "id" | "ativo">;
