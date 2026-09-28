import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { Chat } from '../types';
import { formatPhone, formatTime } from '../utils/format';
import { Avatar } from './Avatar';

interface Props {
  chat: Chat | undefined;
  onSend: (chatId: string, text: string) => void;
  onBack: () => void;
}

const MAX_LENGTH = 4000;

export function ChatWindow({ chat, onSend, onBack }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat?.messages.length, chat?.id]);

  if (!chat) {
    return (
      <section className="chat chat--empty">
        <p>Выберите чат или создайте новый</p>
      </section>
    );
  }

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSend(chat.id, value);
    setText('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section className="chat">
      <header className="chat__header">
        <button className="icon-button chat__back" onClick={onBack} aria-label="Назад">
          ←
        </button>
        <Avatar name={chat.title} />
        <div>
          <div className="chat__title">{chat.title}</div>
          {formatPhone(chat.id) !== chat.title && <div className="chat__subtitle">{formatPhone(chat.id)}</div>}
        </div>
      </header>

      <div className="chat__messages" ref={listRef}>
        {chat.messages.length === 0 && <div className="chat__placeholder">Напишите первое сообщение</div>}
        {chat.messages.map((m) => (
          <div key={m.id} className={`message message--${m.direction} ${m.status === 'error' ? 'message--error' : ''}`}>
            <div className="message__text">{m.text}</div>
            <div className="message__meta">
              {formatTime(m.timestamp)}
              {m.direction === 'out' && (
                <span className="message__status">
                  {m.status === 'sending' ? ' ·' : m.status === 'error' ? ' ⚠ не отправлено' : ' ✓'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="composer">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKeyDown}
          placeholder="Сообщение"
          rows={1}
          aria-label="Текст сообщения"
        />
        <button onClick={submit} disabled={!text.trim()} aria-label="Отправить">
          ➤
        </button>
      </footer>
    </section>
  );
}
