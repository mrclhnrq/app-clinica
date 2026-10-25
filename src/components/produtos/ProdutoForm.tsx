import { FormLayout, FormRow, textareaStyle } from "@/components/FormLayout";
import { LabeledInput } from "@/components/LabeledInput";
import { useToast } from "@/components/ToastProvider";
import { useFormState } from "@/hooks/useFormState";
import { Produto, ProdutoInput } from "@/types/produto";
import { parseCurrency, toMoneyText } from "@/utils/format";

type FormState = {
  nome: string;
  descricao: string;
  marca: string;
  categoria: string;
  estoque: string;
  valorCusto: string;
  valorVenda: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

type ProdutoFormProps = {
  initialValue?: Produto;
  submitLabel: string;
  onSubmit: (input: ProdutoInput) => Promise<void>;
  onCancel?: () => void;
};

function toFormState(p?: Produto): FormState {
  return {
    nome: p?.nome ?? "",
    descricao: p?.descricao ?? "",
    marca: p?.marca ?? "",
    categoria: p?.categoria ?? "",
    estoque: p ? String(p.estoque) : "",
    valorCusto: p ? toMoneyText(p.valorCusto) : "",
    valorVenda: p ? toMoneyText(p.valorVenda) : "",
  };
}

// descrição é opcional (como no protótipo)
function validate(v: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!v.nome.trim()) errors.nome = "Informe o nome do produto";
  if (!v.marca.trim()) errors.marca = "Informe a marca";
  if (!v.categoria.trim()) errors.categoria = "Informe a categoria";
  if (!/^\d+$/.test(v.estoque.trim())) errors.estoque = "Informe a quantidade";
  if (!/\d/.test(v.valorCusto)) errors.valorCusto = "Informe o valor de custo";
  if (!/\d/.test(v.valorVenda)) errors.valorVenda = "Informe o valor de venda";
  return errors;
}

export function ProdutoForm({ initialValue, submitLabel, onSubmit, onCancel }: ProdutoFormProps) {
  const { showToast } = useToast();
  const { values, errors, setErrors, change } = useFormState<FormState>(() => toFormState(initialValue));

  async function handleSubmit() {
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      showToast("Preencha todos os campos corretamente", "error");
      return;
    }

    await onSubmit({
      nome: values.nome.trim(),
      descricao: values.descricao.trim(),
      marca: values.marca.trim(),
      categoria: values.categoria.trim(),
      estoque: parseInt(values.estoque, 10),
      valorCusto: parseCurrency(values.valorCusto),
      valorVenda: parseCurrency(values.valorVenda),
    });
  }

  return (
    <FormLayout submitLabel={submitLabel} onSubmit={handleSubmit} onCancel={onCancel}>
      <LabeledInput
        label="Nome do Produto"
        placeholder="Ex: Protetor Solar Adcos FPS 50"
        value={values.nome}
        onChangeText={change("nome")}
        error={errors.nome}
      />

      <LabeledInput
        label="Descrição"
        placeholder="Resumo do produto, indicações e modo de uso..."
        value={values.descricao}
        onChangeText={change("descricao")}
        multiline
        style={textareaStyle}
      />

      <FormRow>
        <LabeledInput
          label="Marca"
          placeholder="Ex: Adcos"
          value={values.marca}
          onChangeText={change("marca")}
          error={errors.marca}
        />
        <LabeledInput
          label="Qtd. em Estoque"
          placeholder="0"
          keyboardType="number-pad"
          value={values.estoque}
          onChangeText={change("estoque")}
          error={errors.estoque}
        />
      </FormRow>

      <LabeledInput
        label="Categoria"
        placeholder="Ex: Hidratação"
        value={values.categoria}
        onChangeText={change("categoria")}
        error={errors.categoria}
      />

      <FormRow>
        <LabeledInput
          label="Valor de Custo (R$)"
          placeholder="0,00"
          keyboardType="decimal-pad"
          value={values.valorCusto}
          onChangeText={change("valorCusto")}
          error={errors.valorCusto}
        />
        <LabeledInput
          label="Valor de Venda (R$)"
          placeholder="0,00"
          keyboardType="decimal-pad"
          value={values.valorVenda}
          onChangeText={change("valorVenda")}
          error={errors.valorVenda}
        />
      </FormRow>
    </FormLayout>
  );
}