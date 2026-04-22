// Helpers de Web Push (sem FCM, só Web Push API + VAPID).
// Fluxo:
//   1. subscribeToPush(publicKey) — registra SW dedicado e pede subscription
//   2. Retorna o objeto PushSubscription (que fica salvo no Firestore)
//   3. Servidor (Vercel Cron) usa esse subscription pra enviar push no horário

// VAPID public key — segura pra expor no cliente.
export const VAPID_PUBLIC_KEY =
  'BF8OOelGlJWE7PBCRRfJmxciY3UZT_qZ6s8yc3P3xqhU5o3z_RydrH0Bv4MtwMerTUSlM7fR1dHcP2z5XCMcU64';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
};

export const pushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Registra o push-sw.js e faz subscribe na Push API.
 * Retorna o JSON da subscription (pra salvar no Firestore) ou null em erro.
 */
export const subscribeToPush = async (): Promise<PushSubscriptionJSON | null> => {
  if (!pushSupported()) return null;
  try {
    // Registra o SW dedicado
    const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
    // Espera ativar
    await navigator.serviceWorker.ready;

    // Já tem subscription? Reutiliza
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }
    return sub.toJSON();
  } catch (err) {
    console.error('Erro ao fazer subscribe push:', err);
    return null;
  }
};

export const unsubscribeFromPush = async (): Promise<boolean> => {
  if (!pushSupported()) return false;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
};
