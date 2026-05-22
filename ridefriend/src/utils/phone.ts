// Ficheiro: src/utils/phone.ts | Função: canonicalização de números para o formato E.164 do mercado activo
// Razão: o trigger SQL `normalize_phone` apenas tira não-dígitos e o "0" inicial. Se o número
// já tiver o country code (porque foi guardado em formato local), os dois lados não fazem match.
// Para garantir o auto-link de phantom contacts, normalizamos sempre a alias_phone ao escrever.

/**
 * Converte um número (em qualquer formato razoável) para E.164 (`+CCNNNNNNNNN`), usando
 * o `marketPrefix` (ex.: "+244") como fallback quando o número não traz country code.
 *
 * Exemplos com marketPrefix "+244":
 *   "924 546 880"          → "+244924546880"
 *   "0924546880"           → "+244924546880"
 *   "+244 924 546 880"     → "+244924546880"
 *   "00244924546880"       → "+244924546880"  (prefixo internacional "00")
 *   "244924546880"         → "+244924546880"
 */
export function toE164(phone: string, marketPrefix: string): string {
  const trimmed = phone.trim();
  // Se já vem com `+` explícito, assume E.164 — só limpa não-dígitos.
  // Evita prefixar um número estrangeiro (ex.: "+351...") com o prefixo do mercado activo.
  if (trimmed.startsWith('+')) {
    return `+${trimmed.replace(/\D/g, '')}`;
  }

  const prefixDigits = marketPrefix.replace(/\D/g, '');
  let digits = trimmed.replace(/\D/g, '');

  // 00CC... → CC... (prefixo internacional alternativo)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Tira "0" inicial (formato local em muitos mercados)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // Se ainda não começar com o country code do mercado, prepende
  if (prefixDigits && !digits.startsWith(prefixDigits)) {
    digits = prefixDigits + digits;
  }
  return `+${digits}`;
}
