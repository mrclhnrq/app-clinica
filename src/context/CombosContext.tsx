import { createCadastroContext } from "@/context/createCadastroContext";
import * as comboService from "@/services/comboService";
import { Combo, ComboInput } from "@/types/combo";

const { Provider, useCadastro } = createCadastroContext<Combo, ComboInput>(comboService, "combos");

export const CombosProvider = Provider;

export function useCombos() {
  const c = useCadastro();
  return {
    combos: c.itens,
    carregando: c.carregando,
    erro: c.erro,
    recarregar: c.recarregar,
    getCombo: c.getItem,
    adicionarCombo: c.adicionar,
    editarCombo: c.editar,
    inativarCombo: c.inativar,
    reativarCombo: c.reativar,
  };
}