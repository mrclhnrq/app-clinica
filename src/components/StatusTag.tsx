import { Tag } from "@/components/Tag";

export function StatusTag({ ativo }: { ativo: boolean }) {
  return <Tag label={ativo ? "Ativo" : "Inativo"} tone={ativo ? "success" : "neutral"} />;
}