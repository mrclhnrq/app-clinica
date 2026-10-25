import { useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { FormLayout, FormRow, textareaStyle } from "@/components/FormLayout";
import { LabeledInput } from "@/components/LabeledInput";
import { SelecaoItens } from "@/components/SelecaoItens";
import { SeletorItensModal } from "@/components/SeletorItensModal";
import { useToast } from "@/components/ToastProvider";
import { colors, spacing, typography } from "@/constants/theme";
import { useProdutos } from "@/context/ProdutosContext";
import { useServicos } from "@/context/ServicosContext";
import { useFormState } from "@/hooks/useFormState";
import { Combo, ComboInput, ItemCombo } from "@/types/combo";
import { aplicarDesconto, aplicarSelecao, calcularTotal, rotuloItem } from "@/utils/combo";
import { formatCurrency, parseCurrency, toMoneyText } from "@/utils/format";

type FormState = { nome: string; descricao: string; desconto: string };
type FormErrors = Partial<Record<keyof FormState, string>>;
type TipoItem = "servicos" | "produtos";

type ComboFormProps = {
  initialValue?: Combo;
  submitLabel: string;
  onSubmit: (input: ComboInput) => Promise<void>;
  onCancel?: () => void;
};

const paraItemCombo = (item: { id: string; nome: string; valorVenda: number }): ItemCombo => ({
  id: item.id,
  nome: item.nome,
  valorVenda: item.valorVenda,
  ativo: true,
});

export function ComboForm({ initialValue, submitLabel, onSubmit, onCancel }: ComboFormProps) {
  const { showToast } = useToast();
  const { servicos } = useServicos();
  const { produtos } = useProdutos();

  const { values, errors, setErrors, change } = useFormState<FormState>(() => ({
    nome: initialValue?.nome ?? "",
    descricao: initialValue?.descricao ?? "",
    desconto: initialValue && initialValue.desconto > 0 ? String(initialValue.desconto).replace(".", ",") : "",
  }));

  const [servicosSel, setServicosSel] = useState<ItemCombo[]>(initialValue?.servicos ?? []);
  const [produtosSel, setProdutosSel] = useState<ItemCombo[]>(initialValue?.produtos ?? []);
  const [seletor, setSeletor] = useState<TipoItem | null>(null);
  const [erroServicos, setErroServicos] = useState<string>();

  // novo combo: sempre calculado. Edição: só depois que mexer em itens/desconto,
  // assim combos antigos da web mantêm o valor que foi digitado à mão.
  const [recalcular, setRecalcular] = useState(!initialValue);

  // só itens ativos podem ser adicionados
  const disponiveis = useMemo(
    () => ({
      servicos: servicos.filter((s) => s.ativo).map(paraItemCombo),
      produtos: produtos.filter((p) => p.ativo).map(paraItemCombo),
    }),
    [servicos, produtos]
  );

  const desconto = parseCurrency(values.desconto);
  const total = calcularTotal([...servicosSel, ...produtosSel]);
  const valorFinal = recalcular ? aplicarDesconto(total, desconto) : (initialValue?.valorFinal ?? 0);

  function confirmarSelecao(ids: string[]) {
    if (seletor === "servicos") {
      setServicosSel((atuais) => aplicarSelecao(atuais, ids, disponiveis.servicos));
      setErroServicos(undefined);
    } else if (seletor === "produtos") {
      setProdutosSel((atuais) => aplicarSelecao(atuais, ids, disponiveis.produtos));
    }
    setRecalcular(true);
    setSeletor(null);
  }

  function remover(tipo: TipoItem, id: string) {
    const semOItem = (itens: ItemCombo[]) => itens.filter((item) => item.id !== id);
    if (tipo === "servicos") setServicosSel(semOItem);
    else setProdutosSel(semOItem);
    setRecalcular(true);
  }

  async function handleSubmit() {
    const found: FormErrors = {};
    if (!values.nome.trim()) found.nome = "Informe o nome do combo";
    if (desconto > 100) found.desconto = "Use um valor entre 0 e 100";
    const semServico = servicosSel.length === 0;

    if (Object.keys(found).length > 0 || semServico) {
      setErrors(found);
      setErroServicos(semServico ? "Inclua pelo menos 1 serviço" : undefined);
      showToast("Confira os campos do combo", "error");
      return;
    }

    await onSubmit({
      nome: values.nome.trim(),
      descricao: values.descricao.trim(),
      desconto,
      valorFinal,
      servicoIds: servicosSel.map((item) => item.id),
      produtoIds: produtosSel.map((item) => item.id),
    });
  }

  const itensDoSeletor = seletor ? disponiveis[seletor] : [];
  const selecionadosDoSeletor = seletor === "servicos" ? servicosSel : produtosSel;

  return (
    <>
      <FormLayout submitLabel={submitLabel} onSubmit={handleSubmit} onCancel={onCancel}>
        <LabeledInput
          label="Nome do Combo"
          placeholder="Ex: Combo Noiva Premium"
          value={values.nome}
          onChangeText={change("nome")}
          error={errors.nome}
        />

        <LabeledInput
          label="Descrição"
          placeholder="Resumo dos benefícios e serviços integrados..."
          value={values.descricao}
          onChangeText={change("descricao")}
          multiline
          style={textareaStyle}
        />

        <SelecaoItens
          titulo="Serviços Inclusos"
          rotuloAdicionar="+ Serviço"
          itens={servicosSel.map((item) => ({ id: item.id, label: rotuloItem(item) }))}
          onRemover={(id) => remover("servicos", id)}
          onAdicionar={() => setSeletor("servicos")}
          erro={erroServicos}
        />

        <SelecaoItens
          titulo="Produtos Inclusos"
          rotuloAdicionar="+ Produto"
          itens={produtosSel.map((item) => ({ id: item.id, label: rotuloItem(item) }))}
          onRemover={(id) => remover("produtos", id)}
          onAdicionar={() => setSeletor("produtos")}
        />

        <FormRow>
          <LabeledInput
            label="Desconto (%)"
            placeholder="0"
            keyboardType="decimal-pad"
            value={values.desconto}
            onChangeText={(texto) => {
              change("desconto")(texto);
              setRecalcular(true);
            }}
            error={errors.desconto}
          />
          <LabeledInput
            label="Valor Final (R$)"
            value={toMoneyText(valorFinal)}
            editable={false}
            style={styles.somenteLeitura}
          />
        </FormRow>
        <Text style={styles.soma}>Soma dos itens: {formatCurrency(total)}</Text>
      </FormLayout>

      <SeletorItensModal
        visible={seletor !== null}
        titulo={seletor === "servicos" ? "Adicionar serviços" : "Adicionar produtos"}
        vazio={seletor === "servicos" ? "Nenhum serviço ativo disponível" : "Nenhum produto ativo disponível"}
        opcoes={itensDoSeletor.map((item) => ({
          id: item.id,
          label: item.nome,
          detalhe: formatCurrency(item.valorVenda),
        }))}
        selecionados={selecionadosDoSeletor.map((item) => item.id)}
        onConfirmar={confirmarSelecao}
        onFechar={() => setSeletor(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  somenteLeitura: { backgroundColor: colors.neutralLight },
  soma: { ...typography.small, color: colors.textLight, marginTop: spacing.sm },
});