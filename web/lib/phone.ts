/**
 * Utilidades de formateo y normalización para números telefónicos de Argentina (WhatsApp)
 */

export function extractLocalPhone(raw: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("549")) digits = digits.slice(3);
  else if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export function formatArgentinaPhone(raw: string): string {
  let d = extractLocalPhone(raw);
  
  // Limpiar 15 si se ingresó luego de un prefijo de 2 dígitos (ej. 11 15...)
  if (d.startsWith("1115")) {
    d = "11" + d.slice(4);
  }
  
  // Máximo 10 dígitos (código de área + número local)
  d = d.slice(0, 10);

  if (d.length === 0) return "";

  // Área de 2 dígitos (11 - AMBA / CABA)
  if (d.startsWith("11")) {
    if (d.length <= 2) return d;
    if (d.length <= 6) return `${d.slice(0, 2)} ${d.slice(2)}`;
    return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  // Área de 3 dígitos (ej. 383, 351, 221, 223, 261, 341, 381, 387, etc.)
  const is3Digit = d.length >= 3 && /^(22|26|29|34|35|37|38)[0-9]/.test(d.slice(0, 3));
  if (is3Digit || d.length <= 7) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
    return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}`;
  }

  // Área de 4 dígitos (ciudades del interior)
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 6)}-${d.slice(6)}`;
}

export function toWhatsAppPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("54")) {
    return digits;
  }
  const clean = digits.replace(/^0+/, "");
  return `549${clean}`;
}
