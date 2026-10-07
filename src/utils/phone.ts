/** Оставляет только цифры номера (8 в начале трактуем как российскую 7). */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

/** GREEN-API для MAX принимает номера с кодом 7 (РФ) и 375 (РБ). */
export function isValidPhone(digits: string): boolean {
  if (digits.startsWith('375')) return digits.length === 12;
  if (digits.startsWith('7')) return digits.length === 11;
  return false;
}

export function formatPhone(digits: string): string {
  if (digits.startsWith('7') && digits.length === 11) {
    return `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  if (digits.startsWith('375') && digits.length === 12) {
    return `+375 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`;
  }
  return `+${digits}`;
}
