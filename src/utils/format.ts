const time = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export function formatTime(timestamp: number): string {
  return time.format(new Date(timestamp));
}

export function formatDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return 'Сегодня';
  if (isSameDay(date, yesterday)) return 'Вчера';
  return day.format(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

/** Две первые буквы для аватара чата. */
export function initials(name: string): string {
  const letters = name.replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/);
  if (letters.length === 0 || !letters[0]) return '#';
  if (letters.length === 1) return letters[0].slice(0, 2).toUpperCase();
  return (letters[0][0] + letters[1][0]).toUpperCase();
}
