import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Screen = 'list' | 'detail' | 'add' | 'edit' | 'delete';

const clients = [
  {
    initials: 'MS',
    name: 'Maria Silva Santos',
    email: 'maria.silva@email.com',
    phone: '(11) 99999-0000',
  },
  {
    initials: 'JP',
    name: 'Joao Pedro de Oliveira',
    email: 'jp.oliveira@outlook.com',
    phone: '(11) 98888-1111',
  },
  {
    initials: 'AB',
    name: 'Ana Beatriz Rodrigues',
    email: 'anabeatriz@gmail.com',
    phone: '(11) 97777-2222',
  },
  {
    initials: 'CE',
    name: 'Carlos Eduardo Costa',
    email: 'cadu.costa@empresa.com',
    phone: '(11) 96666-3333',
  },
];

export default function ClientesScreen() {
  const [screen, setScreen] = useState<Screen>('list');

  return (
    <View style={styles.routeBackground}>
      <SafeAreaView style={[styles.appScreen, screen === 'delete' && styles.appScreenDim]}>
        {screen === 'list' && (
          <ClientList
            onAdd={() => setScreen('add')}
            onOpen={() => setScreen('detail')}
          />
        )}
        {screen === 'detail' && (
          <ClientDetail
            onBack={() => setScreen('list')}
            onEdit={() => setScreen('edit')}
            onDelete={() => setScreen('delete')}
          />
        )}
        {screen === 'add' && <ClientForm mode="add" onBack={() => setScreen('list')} />}
        {screen === 'edit' && <ClientForm mode="edit" onBack={() => setScreen('detail')} />}
        {screen === 'delete' && (
          <DeleteSheet onCancel={() => setScreen('detail')} onConfirm={() => setScreen('list')} />
        )}
      </SafeAreaView>
    </View>
  );
}

function Header({
  title,
  titleSize = 22,
  onBack,
  action,
}: {
  title: string;
  titleSize?: number;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerTitle} disabled={!onBack}>
        <Text style={styles.backArrow}>{'<'}</Text>
        <Text style={[styles.headerText, { fontSize: titleSize }]}>{title}</Text>
      </Pressable>
      {action}
    </View>
  );
}

function ClientList({
  onAdd,
  onOpen,
}: {
  onAdd: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <Header
        title="Clientes"
        action={
          <Pressable onPress={onAdd} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        }
      />
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <SearchIcon />
          <Text style={styles.searchText}>Buscar clientes...</Text>
        </View>
      </View>
      <View style={styles.listContent}>
        {clients.map((client, index) => (
          <Pressable key={client.email} onPress={onOpen} style={styles.clientCard}>
            <Avatar initials={client.initials} size={46} background={palette.avatarBg} color={palette.primary} />
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <Text style={styles.clientMeta}>{client.email}</Text>
              <Text style={styles.clientMeta}>{client.phone}</Text>
            </View>
          </Pressable>
        ))}
        <View style={styles.countWrap}>
          <Text style={styles.countText}>Mostrando 4 de 120 clientes cadastrados</Text>
        </View>
      </View>
    </>
  );
}

function ClientDetail({
  onBack,
  onEdit,
  onDelete,
}: {
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <Header
        title="Ficha do Cliente"
        titleSize={20}
        onBack={onBack}
        action={
          <View style={styles.detailHeaderActions}>
            <Pressable onPress={onEdit} style={styles.circleAction} />
            <Pressable onPress={onDelete} style={styles.circleAction} />
          </View>
        }
      />
      <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.profileHead}>
            <Avatar initials="MS" size={56} background={palette.title} color="#ffffff" large />
            <View>
              <Text style={styles.profileName}>Maria Silva Santos</Text>
              <View style={styles.goldBadge} />
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldList}>
            <InfoField label="E-MAIL" value="maria.silva@email.com" />
            <InfoField label="TELEFONE" value="(11) 99999-0000" />
            <InfoField label="CPF" value="321.456.987-00" />
            <InfoField label="ENDERECO" value="Rua das Alamedas, 450 - Ap 32 - Jardins - Sao Paulo/SP" />
            <InfoField
              label="OBSERVACOES"
              value="Cliente prefere atendimento no periodo da tarde. Alergica a compostos acidos de peeling quimico."
              multiline
            />
          </View>
        </View>

        <Text style={styles.historyTitle}>Historico de Servicos</Text>
        <View style={styles.historyList}>
          <HistoryCard service="Limpeza de Pele Profunda" order="OS-493 - 12 Mar 2026" amount="R$ 180,00" />
          <HistoryCard service="Drenagem Linfatica Corporal" order="OS-382 - 24 Fev 2026" amount="R$ 220,00" />
        </View>
      </ScrollView>
      <View style={styles.actionRow}>
        <Pressable onPress={onEdit} style={styles.editButton}>
          <Text style={styles.editButtonText}>Editar Ficha</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.deleteOutlineButton}>
          <Text style={styles.deleteOutlineText}>Excluir</Text>
        </Pressable>
      </View>
    </>
  );
}

function ClientForm({ mode, onBack }: { mode: 'add' | 'edit'; onBack: () => void }) {
  const isEdit = mode === 'edit';

  return (
    <>
      {isEdit ? (
        <Header title="Editar Cliente" titleSize={26} onBack={onBack} />
      ) : (
        <Pressable onPress={onBack} style={styles.formTitleWrap}>
          <Text style={styles.formTitle}>Novo Cliente</Text>
        </Pressable>
      )}
      <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
        <FormInput
          label="Nome Completo"
          required
          focused
          placeholder="Digite o nome completo do cliente"
          value={isEdit ? 'Maria Silva Santos' : undefined}
        />
        <FormInput
          label="Email"
          required
          placeholder="exemplo@clinica.com.br"
          value={isEdit ? 'maria.silva@email.com' : undefined}
        />
        <View style={styles.twoColumns}>
          <FormInput
            label="Telefone"
            required
            placeholder="(11) 99999-0000"
            value={isEdit ? '(11) 99999-0000' : undefined}
            compact
          />
          <FormInput
            label="CPF"
            placeholder="000.000.000-00"
            value={isEdit ? '321.456.987-00' : undefined}
            compact
          />
        </View>
        <View style={styles.addressBox}>
          <Text style={styles.addressTitle}>ENDERECO</Text>
          <FormInput
            label="Rua / Logradouro"
            placeholder="Av. Paulista"
            value={isEdit ? 'Rua das Alamedas' : undefined}
            small
          />
          <View style={styles.numberRow}>
            <View style={styles.numberField}>
              <FormInput label="Numero" placeholder="1000" value={isEdit ? '450 - Ap 32' : undefined} small />
            </View>
            <FormInput label="Bairro" placeholder="Bela Vista" value={isEdit ? 'Jardins' : undefined} small />
          </View>
          <View style={styles.cityRow}>
            <FormInput label="Cidade" placeholder="Sao Paulo" value={isEdit ? 'Sao Paulo' : undefined} small />
            <View style={styles.stateField}>
              <FormInput label="Estado" placeholder="SP" value={isEdit ? 'SP' : undefined} small narrow />
            </View>
          </View>
          <FormInput label="CEP" placeholder="01310-100" value={isEdit ? '01234-567' : undefined} small />
        </View>
        <View style={styles.textAreaWrap}>
          <Text style={styles.label}>Observacoes Clinicas / Gerais</Text>
          <TextInput
            multiline
            placeholder="Insira historico relevante, restricoes ou observacoes especificas deste cliente..."
            placeholderTextColor={palette.placeholder}
            value={
              isEdit
                ? 'Cliente prefere atendimento no periodo da tarde. Alergica a compostos acidos de peeling quimico.'
                : undefined
            }
            style={[styles.input, styles.textArea, isEdit && styles.inputValue]}
          />
        </View>
        <View style={styles.formActionRow}>
          <Pressable onPress={onBack} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Salvar</Text>
          </Pressable>
          <Pressable onPress={onBack} style={styles.cancelOutlineButton}>
            <Text style={styles.cancelOutlineText}>Cancelar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

function DeleteSheet({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <View style={styles.sheetScreen}>
      <View style={styles.sheet}>
        <View style={styles.handleWrap}>
          <View style={styles.handle} />
        </View>
        <View style={styles.alertIconWrap}>
          <View style={styles.alertIcon}>
            <Text style={styles.alertX}>x</Text>
          </View>
        </View>
        <View style={styles.sheetTextBlock}>
          <Text style={styles.sheetTitle}>Confirmar exclusao</Text>
          <Text style={styles.sheetBody}>Tem certeza que deseja excluir este cliente?</Text>
          <Text style={styles.sheetNote}>Esta acao nao pode ser desfeita.</Text>
        </View>
        <View style={styles.sheetButtons}>
          <Pressable onPress={onCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={onConfirm} style={styles.deleteButton}>
            <Text style={styles.deleteButtonText}>Excluir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function FormInput({
  label,
  required,
  focused,
  placeholder,
  value,
  compact,
  small,
  narrow,
}: {
  label: string;
  required?: boolean;
  focused?: boolean;
  placeholder?: string;
  value?: string;
  compact?: boolean;
  small?: boolean;
  narrow?: boolean;
}) {
  return (
    <View style={[styles.inputGroup, compact && styles.inputGroupCompact]}>
      <Text style={[styles.label, small && styles.smallLabel]}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={palette.placeholder}
        style={[
          styles.input,
          focused && styles.inputFocused,
          value && styles.inputValue,
          small && styles.smallInput,
          narrow && styles.narrowInput,
        ]}
      />
    </View>
  );
}

function Avatar({
  initials,
  size,
  background,
  color,
  large = false,
}: {
  initials: string;
  size: number;
  background: string;
  color: string;
  large?: boolean;
}) {
  return (
    <View style={[styles.avatar, { width: size, height: size, backgroundColor: background }]}>
      <Text style={[styles.avatarText, { color }, large && styles.avatarTextLarge]}>{initials}</Text>
    </View>
  );
}

function InfoField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, multiline && styles.infoValueMultiline]}>{value}</Text>
    </View>
  );
}

function HistoryCard({ service, order, amount }: { service: string; order: string; amount: string }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyLeft}>
        <Text style={styles.historyService}>{service}</Text>
        <Text style={styles.historyOrder}>{order}</Text>
      </View>
      <View style={styles.historyRight}>
        <View style={styles.doneBadge}>
          <Text style={styles.doneText}>Concluido</Text>
        </View>
        <Text style={styles.historyAmount}>{amount}</Text>
      </View>
    </View>
  );
}

function SearchIcon() {
  return (
    <View style={styles.searchIcon}>
      <View style={styles.searchCircle} />
      <View style={styles.searchHandle} />
    </View>
  );
}

const palette = {
  route: '#e8e8f0',
  phone: '#f0f0f8',
  ink: '#1a1a2e',
  title: '#5b2d8e',
  primary: '#6a3db8',
  avatarBg: '#e8e0f5',
  muted: '#b0aabf',
  subtle: '#9a98b0',
  textSoft: '#7a7a9a',
  formText: '#4a4a6a',
  line: '#ebebf5',
  inputLine: '#e0dff0',
  focus: '#c9a820',
  danger: '#e03535',
  successBg: '#e6f9ee',
  success: '#2a9d5c',
  placeholder: '#9a98b0',
};

const fontFamily = Platform.select({
  web: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
  default: undefined,
});

const styles = StyleSheet.create({
  routeBackground: {
    flex: 1,
    backgroundColor: palette.phone,
    alignItems: 'center',
  },
  appScreen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: palette.phone,
    flexDirection: 'column',
  },
  appScreenDim: {
    backgroundColor: '#7a7a7a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backArrow: {
    fontFamily,
    width: 22,
    height: 22,
    fontSize: 34,
    lineHeight: 22,
    color: palette.title,
    fontWeight: '400',
  },
  headerText: {
    fontFamily,
    color: palette.title,
    fontWeight: '700',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: palette.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontFamily,
    color: '#ffffff',
    fontSize: 32,
    lineHeight: 34,
    fontWeight: '300',
  },
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBox: {
    height: 45,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchText: {
    fontFamily,
    color: palette.muted,
    fontSize: 15,
  },
  searchIcon: {
    width: 18,
    height: 18,
  },
  searchCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: palette.muted,
  },
  searchHandle: {
    position: 'absolute',
    width: 7,
    height: 1.8,
    right: 0,
    bottom: 1,
    borderRadius: 2,
    backgroundColor: palette.muted,
    transform: [{ rotate: '45deg' }],
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 10,
    flex: 1,
  },
  clientCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  avatarTextLarge: {
    fontSize: 18,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 2,
  },
  clientMeta: {
    fontFamily,
    fontSize: 13,
    color: palette.textSoft,
  },
  countWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  countText: {
    fontFamily,
    fontSize: 13,
    color: palette.subtle,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.avatarBg,
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: 8,
  },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  profileName: {
    fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: palette.title,
    lineHeight: 24,
  },
  goldBadge: {
    marginTop: 5,
    width: 90,
    height: 14,
    backgroundColor: '#9a7a1a',
    borderRadius: 4,
    opacity: 0.85,
  },
  divider: {
    height: 1,
    backgroundColor: palette.line,
    marginBottom: 14,
  },
  fieldList: {
    gap: 12,
  },
  infoLabel: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600',
    color: palette.subtle,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily,
    fontSize: 15,
    color: palette.ink,
  },
  infoValueMultiline: {
    lineHeight: 22.5,
  },
  historyTitle: {
    fontFamily,
    fontSize: 18,
    fontWeight: '700',
    color: palette.title,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  historyList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  historyLeft: {
    flex: 1,
    paddingRight: 10,
  },
  historyService: {
    fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 3,
  },
  historyOrder: {
    fontFamily,
    fontSize: 13,
    color: palette.subtle,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  doneBadge: {
    backgroundColor: palette.successBg,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  doneText: {
    fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: palette.success,
  },
  historyAmount: {
    fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: palette.title,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  editButtonText: {
    fontFamily,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteOutlineButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: palette.danger,
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  deleteOutlineText: {
    fontFamily,
    color: palette.danger,
    fontSize: 16,
    fontWeight: '700',
  },
  formTitleWrap: {
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  formTitle: {
    fontFamily,
    fontSize: 26,
    fontWeight: '800',
    color: palette.title,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 24,
  },
  inputGroup: {
    flex: 1,
  },
  inputGroupCompact: {
    minWidth: 0,
  },
  label: {
    fontFamily,
    fontSize: 14,
    fontWeight: '500',
    color: palette.formText,
    marginBottom: 6,
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 5,
  },
  required: {
    color: palette.danger,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: palette.inputLine,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    fontFamily,
    fontSize: 15,
    color: palette.placeholder,
    backgroundColor: '#ffffff',
    outlineStyle: 'none',
  } as never,
  inputFocused: {
    borderColor: palette.focus,
    borderWidth: 2,
  },
  inputValue: {
    color: palette.ink,
  },
  smallInput: {
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  narrowInput: {
    paddingHorizontal: 8,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  addressBox: {
    borderWidth: 1.5,
    borderColor: '#d8d0f0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  addressTitle: {
    fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: palette.title,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  numberRow: {
    flexDirection: 'row',
    gap: 10,
  },
  numberField: {
    flexBasis: 90,
    flexGrow: 0,
    flexShrink: 0,
  },
  cityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stateField: {
    flexBasis: 66,
    flexGrow: 0,
    flexShrink: 0,
  },
  textAreaWrap: {
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    paddingTop: 13,
  },
  formActionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 2,
  },
  saveButton: {
    flex: 1,
    backgroundColor: palette.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelOutlineButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderColor: palette.primary,
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
  },
  cancelOutlineText: {
    fontFamily,
    color: palette.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  sheetScreen: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: palette.inputLine,
    borderRadius: 4,
  },
  alertIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fce8e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertX: {
    fontFamily,
    fontSize: 40,
    lineHeight: 42,
    color: palette.danger,
    fontWeight: '300',
  },
  sheetTextBlock: {
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: palette.ink,
    marginBottom: 10,
  },
  sheetBody: {
    fontFamily,
    fontSize: 15,
    color: palette.formText,
    marginBottom: 6,
    textAlign: 'center',
  },
  sheetNote: {
    fontFamily,
    fontSize: 14,
    color: palette.subtle,
    textAlign: 'center',
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0eef8',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: palette.title,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: palette.danger,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
