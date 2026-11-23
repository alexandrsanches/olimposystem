export const digitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');

export function mascaraCpf(v: string | null | undefined) {
  const d = digitos(v).slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraTelefone(v: string | null | undefined) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{1,2})/, '($1');
  if (d.length <= 6) return d.replace(/(\d{2})(\d+)/, '($1) $2');
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
  return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

export function mascaraCep(v: string | null | undefined) {
  return digitos(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

export function dataBr(iso: string | null | undefined) {
  if (!iso) return '—';
  const [data] = iso.split(/[T ]/);
  const [a, m, d] = data.split('-');
  return `${d}/${m}/${a}`;
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export function cpfValido(cpf: string) {
  const d = digitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}
