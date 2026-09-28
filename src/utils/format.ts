export const formatTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export const formatPhone = (chatId: string) => {
  const d = chatId.replace(/@.*$/, '');
  return /^\d+$/.test(d) ? `+${d}` : d;
};
