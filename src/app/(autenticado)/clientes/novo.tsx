import { View } from "react-native";
import { router } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { useClientes } from "@/context/ClientesContext";

export default function NovoCliente() {
  const { adicionarCliente } = useClientes();
  const { showToast } = useToast();

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Novo Cliente" onBack={() => router.back()} />
      <ClienteForm
        submitLabel="Salvar Cliente"
        onSubmit={async (input) => {
          await adicionarCliente(input);
          showToast("Cliente adicionado com sucesso");
          router.back();
        }}
      />
    </View>
  );
}
