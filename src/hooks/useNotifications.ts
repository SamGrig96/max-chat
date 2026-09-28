import { useEffect, useRef, useState } from 'react';
import { deleteNotification, GreenApiError, receiveNotification } from '../api/greenApi';
import type { Credentials, NotificationBody } from '../types';

const RECEIVE_TIMEOUT_SEC = 20;
const RETRY_DELAY_MS = 3000;

export type PollingStatus = 'connecting' | 'online' | 'error';

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      resolve();
    });
  });

export function useNotifications(creds: Credentials | null, onNotification: (body: NotificationBody) => void) {
  const [status, setStatus] = useState<PollingStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const handlerRef = useRef(onNotification);
  useEffect(() => {
    handlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!creds) return;
    const controller = new AbortController();
    const { signal } = controller;

    (async () => {
      setStatus('connecting');
      while (!signal.aborted) {
        try {
          const notification = await receiveNotification(creds, RECEIVE_TIMEOUT_SEC, signal);
          setStatus('online');
          setError(null);
          if (!notification) continue;

          try {
            handlerRef.current(notification.body);
          } finally {
            // иначе уведомление застрянет в очереди
            await deleteNotification(creds, notification.receiptId);
          }
        } catch (e) {
          if (signal.aborted) break;
          setStatus('error');
          setError(e instanceof GreenApiError ? e.message : 'Нет соединения с GREEN-API');
          await sleep(RETRY_DELAY_MS, signal);
        }
      }
    })();

    return () => controller.abort();
  }, [creds]);

  return { status, error };
}
