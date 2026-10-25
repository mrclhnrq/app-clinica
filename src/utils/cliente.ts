// máscaras e validações dos campos de cliente

export const somenteDigitos = (text: string) => text.replace(/\D/g, "");

// "12345678909" -> "123.456.789-09" (aplica conforme digita)
export function maskCpf(text: string): string {
  const d = somenteDigitos(text).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// fixo (10 dígitos) ou celular (11 dígitos)
export function maskTelefone(text: string): string {
  const d = somenteDigitos(text).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  const corte = d.length === 11 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

// "01021995" -> "01/02/1995"
export function maskData(text: string): string {
  const d = somenteDigitos(text).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, "$1/$2").replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
}

// mesmo cálculo do @CPF do backend (dígitos verificadores)
export function cpfValido(cpf: string): boolean {
  const d = somenteDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;

  const digito = (base: string) => {
    const soma = base.split("").reduce((acc, n, i) => acc + Number(n) * (base.length + 1 - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = digito(d.slice(0, 9));
  const d2 = digito(d.slice(0, 9) + d1);
  return d1 === Number(d[9]) && d2 === Number(d[10]);
}

export const emailValido = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const telefoneValido = (tel: string) => {
  const n = somenteDigitos(tel).length;
  return n === 10 || n === 11;
};

// "DD/MM/AAAA" -> "AAAA-MM-DD" (null se inválida)
export function dataBrParaIso(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));
  const existe =
    data.getFullYear() === Number(ano) && data.getMonth() === Number(mes) - 1 && data.getDate() === Number(dia);
  return existe ? `${ano}-${mes}-${dia}` : null;
}

// "AAAA-MM-DD" -> "DD/MM/AAAA"
export function isoParaDataBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

export function idade(iso: string): number {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) anos--;
  return anos;
}

// "Maria Silva Santos" -> "MS"
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// o backend devolve o nome com HTML escapado (sanitizarParaFrontend)
export function decodeHtml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
}
