// src/components/NewConversationButton.tsx
import React from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/NewConversationButton.css'; // Import file CSS tương ứng

const NewConversationButton: React.FC = () => {
  const { startNewConversation } = useChat();

  const handleNewClick = () => {
    // Hỏi xác nhận trước khi bắt đầu đoạn chat mới
    // if (window.confirm("Do you want start a new chat?.")) {
      startNewConversation();
    //}
  };

  return (
    <button onClick={handleNewClick} className="new-conversation-button">
      + New Chat
    </button>
  );
};

export default NewConversationButton;