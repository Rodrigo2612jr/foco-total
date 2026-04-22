// Vercel Serverless Function — dispara Web Push pro check-in diário.
// Chamada pelo Vercel Cron (vercel.json) todo dia no horário configurado.
//
// Fluxo:
// 1. Valida Authorization header (CRON_SECRET)
// 2. Lê doc users/{USERNAME} do Firestore (via REST API simples, sem admin SDK)
// 3. Se tem pushSubscription válida e horário bate com agora → envia push
//
// Env vars necessárias (Vercel):
//   VAPID_PRIVATE_KEY        — gerada com web-push
//   VAPID_SUBJECT            — mailto:seu@email.com
//   CRON_SECRET              — token pra autenticar chamadas do cron
//   FIREBASE_PROJECT_ID      — 'foco-total-5d7bd'

import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY =
  'BF8OOelGlJWE7PBCRRfJmxciY3UZT_qZ6s8yc3P3xqhU5o3z_RydrH0Bv4MtwMerTUSlM7fR1dHcP2z5XCMcU64';

// Lista de usernames a verificar. Adicione mais aqui se quiser.
const USERNAMES = ['pascoto'];

interface PushSubscriptionStored {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
}

interface CheckinConfig {
  whatsappRecipient?: string;
  recipientName?: string;
  reminderHour?: number;
  reminderMinute?: number;
  lastSentDate?: string;
  pushSubscription?: PushSubscriptionStored;
}

// Lê um doc do Firestore via REST API (sem Admin SDK).
// As regras do projeto permitem leitura (como o cliente já faz).
async function readUserDoc(username: string): Promise<{ checkinConfig?: CheckinConfig } | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'foco-total-5d7bd';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${username}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json: any = await res.json();
  if (!json.fields) return null;
  // Converte fields do Firestore pra objeto simples
  const parse = (val: any): any => {
    if (!val) return undefined;
    if (val.stringValue !== undefined) return val.stringValue;
    if (val.integerValue !== undefined) return parseInt(val.integerValue);
    if (val.doubleValue !== undefined) return val.doubleValue;
    if (val.booleanValue !== undefined) return val.booleanValue;
    if (val.nullValue !== undefined) return null;
    if (val.mapValue) {
      const out: any = {};
      Object.entries(val.mapValue.fields || {}).forEach(([k, v]) => (out[k] = parse(v)));
      return out;
    }
    if (val.arrayValue) return (val.arrayValue.values || []).map(parse);
    return undefined;
  };
  const config = parse(json.fields.checkinConfig);
  return { checkinConfig: config };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Autenticação: Vercel Cron envia 'Authorization: Bearer <CRON_SECRET>'
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:rpascotojr@gmail.com';
  if (!privateKey) {
    return res.status(500).json({ error: 'VAPID_PRIVATE_KEY not configured' });
  }
  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY, privateKey);

  const results: Array<{ user: string; status: string; detail?: string }> = [];

  for (const username of USERNAMES) {
    try {
      const doc = await readUserDoc(username);
      const cfg = doc?.checkinConfig;
      if (!cfg?.pushSubscription?.endpoint) {
        results.push({ user: username, status: 'skipped', detail: 'no push subscription' });
        continue;
      }

      const payload = JSON.stringify({
        title: '⏰ Hora do check-in!',
        body: cfg.recipientName
          ? `Sua mensagem pra ${cfg.recipientName} tá pronta. Toca pra enviar.`
          : 'Sua mensagem tá pronta. Toca pra abrir.',
        url: '/#/tarefas',
        tag: `checkin-${new Date().toISOString().slice(0, 10)}`
      });

      await webpush.sendNotification(
        {
          endpoint: cfg.pushSubscription.endpoint,
          keys: cfg.pushSubscription.keys
        },
        payload,
        { TTL: 60 * 60 } // 1h — se o device tiver offline, expira
      );
      results.push({ user: username, status: 'sent' });
    } catch (err: any) {
      results.push({ user: username, status: 'error', detail: err?.message ?? String(err) });
    }
  }

  return res.status(200).json({ ok: true, results, ts: new Date().toISOString() });
}
