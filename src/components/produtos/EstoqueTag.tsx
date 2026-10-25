import { Tag, TagTone } from "@/components/Tag";
import { NivelEstoque, nivelEstoque } from "@/utils/estoque";

const ROTULOS: Record<NivelEstoque, { label: string; tone: TagTone }> = {
  ok: { label: "Em Estoque", tone: "info" },
  baixo: { label: "Estoque Baixo", tone: "danger" },
  zerado: { label: "Sem Estoque", tone: "danger" },
};

export function EstoqueTag({ estoque }: { estoque: number }) {
  const { label, tone } = ROTULOS[nivelEstoque(estoque)];
  return <Tag label={label} tone={tone} />;
}