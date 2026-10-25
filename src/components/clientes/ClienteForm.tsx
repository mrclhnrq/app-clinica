import { FormLayout, FormRow } from "@/components/FormLayout";
import { LabeledInput } from "@/components/LabeledInput";
import { useToast } from "@/components/ToastProvider";
import { useFormState } from "@/hooks/useFormState";
import { Cliente, ClienteInput } from "@/types/cliente";
import {
  cpfValido,
  dataBrParaIso,
  emailValido,
  isoParaDataBr,
  maskCpf,
  maskData,
  maskTelefone,
  telefoneValido,
} from "@/utils/cliente";

type FormState = {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string; // DD/MM/AAAA
};
type FormErrors = Partial<Record<keyof FormState, string>>;

type ClienteFormProps = {
  initialValue?: Cliente;
  submitLabel: string;
  onSubmit: (input: ClienteInput) => Promise<void>;
  onCancel?: () => void;
};

function toFormState(c?: Cliente): FormState {
  return {
    nome: c?.nome ?? "",
    email: c?.email ?? "",
    telefone: c ? maskTelefone(c.telefone) : "",
    cpf: c ? maskCpf(c.cpf) : "",
    dataNascimento: isoParaDataBr(c?.dataNascimento),
  };
}

// mesmas regras do backend (@NotBlank, @Size(min = 3), @CPF, colunas NOT NULL no banco)
function validate(v: FormState): FormErrors {
  const errors: FormErrors = {};
  const nome = v.nome.trim();

  if (nome.length < 3) errors.nome = "Informe o nome completo (mín. 3 letras)";
  else if (/['";*]/.test(nome)) errors.nome = "O nome não pode conter aspas, ponto e vírgula ou *";

  if (!emailValido(v.email)) errors.email = "Informe um e-mail válido";
  if (!telefoneValido(v.telefone)) errors.telefone = "Informe DDD + número";
  if (!cpfValido(v.cpf)) errors.cpf = "CPF inválido";

  if (v.dataNascimento.trim()) {
    const iso = dataBrParaIso(v.dataNascimento);
    if (!iso) errors.dataNascimento = "Use o formato DD/MM/AAAA";
    else if (new Date(iso) > new Date()) errors.dataNascimento = "Data no futuro";
  }
  return errors;
}

export function ClienteForm({ initialValue, submitLabel, onSubmit, onCancel }: ClienteFormProps) {
  const { showToast } = useToast();
  const { values, errors, setErrors, change } = useFormState<FormState>(() => toFormState(initialValue));

  // campos com máscara: formata enquanto digita
  const changeMasked = (field: keyof FormState, mask: (t: string) => string) => (text: string) =>
    change(field)(mask(text));

  async function handleSubmit() {
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      showToast("Preencha todos os campos corretamente", "error");
      return;
    }

    await onSubmit({
      nome: values.nome.trim().replace(/\s+/g, " "),
      email: values.email.trim().toLowerCase(),
      telefone: values.telefone,
      cpf: values.cpf,
      dataNascimento: values.dataNascimento.trim() ? dataBrParaIso(values.dataNascimento) : null,
    });
  }

  return (
    <FormLayout submitLabel={submitLabel} onSubmit={handleSubmit} onCancel={onCancel}>
      <LabeledInput
        label="Nome Completo *"
        placeholder="Digite o nome completo do cliente"
        autoCapitalize="words"
        value={values.nome}
        onChangeText={change("nome")}
        error={errors.nome}
      />

      <LabeledInput
        label="E-mail *"
        placeholder="exemplo@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={values.email}
        onChangeText={change("email")}
        error={errors.email}
      />

      <FormRow>
        <LabeledInput
          label="Telefone *"
          placeholder="(11) 99999-0000"
          keyboardType="phone-pad"
          value={values.telefone}
          onChangeText={changeMasked("telefone", maskTelefone)}
          error={errors.telefone}
        />
        <LabeledInput
          label="CPF *"
          placeholder="000.000.000-00"
          keyboardType="number-pad"
          value={values.cpf}
          onChangeText={changeMasked("cpf", maskCpf)}
          error={errors.cpf}
        />
      </FormRow>

      <LabeledInput
        label="Data de Nascimento"
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
        value={values.dataNascimento}
        onChangeText={changeMasked("dataNascimento", maskData)}
        error={errors.dataNascimento}
      />
    </FormLayout>
  );
}
