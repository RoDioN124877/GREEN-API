import { useCallback } from 'react';
import type { Credentials } from '../api/types';
import { useChat } from '../hooks/useChat';
import { ChatWindow } from './ChatWindow';
import { Sidebar } from './Sidebar';

interface ChatAppProps {
  credentials: Credentials;
  onLogout: () => void;
}

export function ChatApp({ credentials, onLogout }: ChatAppProps) {
  const {
    chats,
    messages,
    activeChatId,
    setActiveChatId,
    connection,
    instanceState,
    createChat,
    sendText,
  } = useChat(credentials);

  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;

  const handleSend = useCallback(
    (text: string) => sendText(activeChat!.id, text),
    [activeChat, sendText],
  );

  return (
    <div className="app">
      {instanceState && instanceState !== 'authorized' && (
        <div className="banner">Состояние инстанса: {instanceState}</div>
      )}
      <div className="app__body">
        <Sidebar
          chats={chats}
          messages={messages}
          activeChatId={activeChatId}
          connection={connection}
          idInstance={credentials.idInstance}
          onSelectChat={setActiveChatId}
          onCreateChat={createChat}
          onLogout={onLogout}
        />
        <ChatWindow
          chat={activeChat}
          messages={activeChat ? (messages[activeChat.id] ?? []) : []}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
