import { useCallback, useEffect, useReducer } from 'react';
import { sendMessage } from '../api/greenApi';
import { chatReducer, initialChatState, type ChatState } from '../store/chatReducer';
import type { Credentials, NotificationBody } from '../types';
import { storage } from '../utils/storage';

const storageKey = (idInstance: string) => `max-chat:chats:${idInstance}`;

export function useChatStore(creds: Credentials) {
  const [state, dispatch] = useReducer(
    chatReducer,
    creds.idInstance,
    (id) => storage.get<ChatState>(storageKey(id)) ?? initialChatState,
  );

  useEffect(() => {
    storage.set(storageKey(creds.idInstance), state);
  }, [creds.idInstance, state]);

  const addChat = useCallback((chatId: string, title: string) => dispatch({ type: 'chat/add', chatId, title }), []);
  const selectChat = useCallback((chatId: string) => dispatch({ type: 'chat/select', chatId }), []);
  const handleNotification = useCallback((body: NotificationBody) => dispatch({ type: 'notification', body }), []);

  const send = useCallback(
    async (chatId: string, text: string) => {
      const tempId = `local-${crypto.randomUUID()}`;
      dispatch({ type: 'message/sending', chatId, tempId, text });
      try {
        const { idMessage } = await sendMessage(creds, chatId, text);
        dispatch({ type: 'message/sent', chatId, tempId, idMessage });
      } catch {
        dispatch({ type: 'message/failed', chatId, tempId });
      }
    },
    [creds],
  );

  return { state, addChat, selectChat, send, handleNotification };
}
