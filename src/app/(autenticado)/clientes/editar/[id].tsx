import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/components/ToastProvider";
import { ClienteForm } from "@/components/clientes/ClienteForm";
import { useClientes } from "@/context/ClientesContext";

export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getCliente, editarCliente } = useClientes();
  const { showToast } = useToast();

  const cliente = getCliente(id);
  if (!cliente) return null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title="Editar Cliente" onBack={() => router.back()} />
      <ClienteForm
        initialValue={cliente}
        submitLabel="Salvar Alterações"
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          await editarCliente(cliente.id, input);
          showToast("Cliente atualizado com sucesso");
          router.dismissAll();
        }}
      />
    </View>
  );
}
