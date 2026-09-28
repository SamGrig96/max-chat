import { describe, expect, it } from 'vitest';
import type { NotificationBody } from '../types';
import { chatReducer, initialChatState, phoneToChatId, type ChatState } from './chatReducer';

const PHONE_CHAT = '79991234567@c.us';

const withChat = (): ChatState => chatReducer(initialChatState, { type: 'chat/add', chatId: PHONE_CHAT, title: '+79991234567' });

const incoming = (overrides: Partial<NotificationBody> = {}): NotificationBody => ({
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1_700_000_000,
  idMessage: 'in-1',
  senderData: { chatId: PHONE_CHAT, sender: '79991234567' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
  ...overrides,
});

describe('phoneToChatId', () => {
  it('normalizes a phone number', () => {
    expect(phoneToChatId('+7 (999) 123-45-67')).toBe(PHONE_CHAT);
  });
  it('rejects too short numbers', () => {
    expect(phoneToChatId('123')).toBeNull();
  });
});

describe('chatReducer', () => {
  it('adds an incoming text message to the matching chat', () => {
    const state = chatReducer(withChat(), { type: 'notification', body: incoming() });
    expect(state.chats[0].messages).toMatchObject([{ id: 'in-1', text: 'Привет', direction: 'in' }]);
  });

  it('supports extendedTextMessage', () => {
    const body = incoming({ messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://max.ru' } } });
    const state = chatReducer(withChat(), { type: 'notification', body });
    expect(state.chats[0].messages[0].text).toBe('https://max.ru');
  });

  it('supports quotedMessage (reply with quote)', () => {
    const body = incoming({ messageData: { typeMessage: 'quotedMessage', extendedTextMessageData: { text: 'Ответ' } } });
    const state = chatReducer(withChat(), { type: 'notification', body });
    expect(state.chats[0].messages[0].text).toBe('Ответ');
  });

  it('ignores non-text messages', () => {
    const body = incoming({ messageData: { typeMessage: 'imageMessage' } });
    const state = chatReducer(withChat(), { type: 'notification', body });
    expect(state.chats[0].messages).toHaveLength(0);
  });

  it('does not duplicate the same notification', () => {
    let state = chatReducer(withChat(), { type: 'notification', body: incoming() });
    state = chatReducer(state, { type: 'notification', body: incoming() });
    expect(state.chats[0].messages).toHaveLength(1);
  });

  it('matches a reply that comes with a numeric MAX chatId via sender phone and remembers the alias', () => {
    const body = incoming({ senderData: { chatId: '10000000', sender: '79991234567' } });
    let state = chatReducer(withChat(), { type: 'notification', body });
    expect(state.chats).toHaveLength(1);
    expect(state.chats[0].messages).toHaveLength(1);
    expect(state.aliases['10000000']).toBe(PHONE_CHAT);

    state = chatReducer(state, { type: 'notification', body: incoming({ idMessage: 'in-2', senderData: { chatId: '10000000' } }) });
    expect(state.chats[0].messages).toHaveLength(2);
  });

  it('replaces the temporary message after send and ignores the echo notification', () => {
    let state = withChat();
    state = chatReducer(state, { type: 'message/sending', chatId: PHONE_CHAT, tempId: 'tmp', text: 'Hi' });
    state = chatReducer(state, { type: 'message/sent', chatId: PHONE_CHAT, tempId: 'tmp', idMessage: 'out-1' });
    state = chatReducer(state, {
      type: 'notification',
      body: incoming({ typeWebhook: 'outgoingAPIMessageReceived', idMessage: 'out-1', messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Hi' } } }),
    });
    expect(state.chats[0].messages).toMatchObject([{ id: 'out-1', status: 'sent', direction: 'out' }]);
  });

  it('handles the echo notification arriving before the HTTP response', () => {
    let state = withChat();
    state = chatReducer(state, { type: 'message/sending', chatId: PHONE_CHAT, tempId: 'tmp', text: 'Hi' });
    state = chatReducer(state, { type: 'notification', body: incoming({ typeWebhook: 'outgoingAPIMessageReceived', idMessage: 'out-1' }) });
    state = chatReducer(state, { type: 'message/sent', chatId: PHONE_CHAT, tempId: 'tmp', idMessage: 'out-1' });
    expect(state.chats[0].messages.map((m) => m.id)).toEqual(['out-1']);
  });

  it('creates a chat when an unknown contact writes and counts unread', () => {
    let state = withChat();
    state = chatReducer(state, {
      type: 'notification',
      body: incoming({ idMessage: 'x', senderData: { chatId: '555', sender: '79990000000', senderName: 'Анна' } }),
    });
    const anna = state.chats.find((c) => c.id === '555');
    expect(anna?.title).toBe('Анна');
    expect(anna?.unread).toBe(1);
    expect(state.activeChatId).toBe(PHONE_CHAT);
  });
});
