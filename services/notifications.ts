// Notificações locais do navegador (funciona sem push server).
// Usadas pra lembrar das tarefas recorrentes pendentes do dia.

export const notificationsSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

export const notificationsPermission = (): NotificationPermission => {
  if (!notificationsSupported()) return 'denied';
  return Notification.permission;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return 'denied';
  }
};

// Controle de idempotência via localStorage: não notificar duas vezes no mesmo dia.
const notifiedKey = (username: string, dateKey: string) =>
  `focototal:notified:${username}:${dateKey}`;

export const notifyDailyRoutineSummary = (params: {
  username: string;
  dateKey: string; // yyyy-MM-dd
  pendingCount: number;
  completedCount: number;
}): void => {
  const { username, dateKey, pendingCount, completedCount } = params;
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;
  if (pendingCount + completedCount === 0) return;

  try {
    const k = notifiedKey(username, dateKey);
    if (typeof localStorage !== 'undefined' && localStorage.getItem(k)) return;

    const title = pendingCount > 0
      ? `Rotina do dia — ${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`
      : 'Rotina do dia — tudo em dia!';
    const body = pendingCount > 0
      ? `Você tem ${pendingCount} tarefa${pendingCount > 1 ? 's' : ''} recorrente${pendingCount > 1 ? 's' : ''} aguardando.`
      : `Todas as ${completedCount} recorrentes de hoje foram concluídas. Parabéns!`;

    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `focototal-daily-${dateKey}`
    });

    if (typeof localStorage !== 'undefined') localStorage.setItem(k, '1');
  } catch {
    // silencioso: browsers bloqueiam em contextos específicos
  }
};
