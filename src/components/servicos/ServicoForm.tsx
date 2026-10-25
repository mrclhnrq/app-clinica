import { FormLayout, FormRow, textareaStyle } from "@/components/FormLayout";
import { LabeledInput } from "@/components/LabeledInput";
import { useToast } from "@/components/ToastProvider";
import { useFormState } from "@/hooks/useFormState";
import { Servico, ServicoInput } from "@/types/servico";
import { parseCurrency, toMoneyText } from "@/utils/format";

type FormState = {
  nome: string;
  descricao: string;
  valorCusto: string;
  valorVenda: string;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

type ServicoFormProps = {
  initialValue?: Servico;
  submitLabel: string;
  onSubmit: (input: ServicoInput) => Promise<void>;
  onCancel?: () => void;
};

function toFormState(s?: Servico): FormState {
  return {
    nome: s?.nome ?? "",
    descricao: s?.descricao ?? "",
    valorCusto: s ? toMoneyText(s.valorCusto) : "",
    valorVenda: s ? toMoneyText(s.valorVenda) : "",
  };
}

function validate(v: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!v.nome.trim()) errors.nome = "Informe o nome do serviço";
  if (!v.descricao.trim()) errors.descricao = "Informe a descrição";
  if (!/\d/.test(v.valorCusto)) errors.valorCusto = "Informe o custo/despesa";
  if (!/\d/.test(v.valorVenda)) errors.valorVenda = "Informe o valor de venda";
  return errors;
}

export function ServicoForm({ initialValue, submitLabel, onSubmit, onCancel }: ServicoFormProps) {
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
      valorCusto: parseCurrency(values.valorCusto),
      valorVenda: parseCurrency(values.valorVenda),
    });
  }

  return (
    <FormLayout submitLabel={submitLabel} onSubmit={handleSubmit} onCancel={onCancel}>
      <LabeledInput
        label="Nome do Serviço"
        placeholder="Ex: Peeling de Diamante"
        value={values.nome}
        onChangeText={change("nome")}
        error={errors.nome}
      />

      <LabeledInput
        label="Descrição"
        placeholder="Detalhes sobre o procedimento e benefícios..."
        value={values.descricao}
        onChangeText={change("descricao")}
        error={errors.descricao}
        multiline
        style={textareaStyle}
      />

      <FormRow>
        <LabeledInput
          label="Custo/Despesa (R$)"
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