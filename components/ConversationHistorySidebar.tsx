// src/components/ConversationHistorySidebar.tsx
import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { Message } from '../models/ChatModels';
import { FiSearch } from 'react-icons/fi';
import '../styles/ConversationHistorySidebar.css';

// Hàm để lấy nhãn thời gian dựa trên ngày của đoạn chat
const getTimeLabel = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const chatDate = new Date(date);
  chatDate.setHours(0, 0, 0, 0);

  if (chatDate.getTime() === today.getTime()) {
    return 'Hôm nay';
  } else if (chatDate.getTime() === yesterday.getTime()) {
    return 'Hôm qua';
  } else if (chatDate.getTime() > oneWeekAgo.getTime()) {
    return 'Tuần này';
  } else if (chatDate.getTime() > oneMonthAgo.getTime()) {
    return 'Tháng này';
  } else if (chatDate.getMonth() === oneMonthAgo.getMonth() && chatDate.getFullYear() === oneMonthAgo.getFullYear()) {
    // Kiểm tra xem có trong tháng trước không
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0); // Ngày cuối cùng của tháng trước
    if (chatDate >= startOfLastMonth && chatDate <= endOfLastMonth) {
      return 'Tháng trước';
    }
  }
  return 'Cũ hơn';
};

// Hàm để nhóm lịch sử theo nhãn thời gian
const groupHistoryByTime = (history: Message[][]) => {
  const grouped: { [key: string]: Message[][] } = {};
  history.forEach(conversation => {
    // Lấy ngày của tin nhắn cuối cùng trong đoạn chat
    const lastMessageDate = conversation.length > 0 ? conversation[conversation.length - 1].timestamp : new Date(0);
    const label = getTimeLabel(lastMessageDate);

    if (!grouped[label]) {
      grouped[label] = [];
    }
    grouped[label].push(conversation);
  });
  return grouped;
};

const ConversationHistorySidebar: React.FC = () => {
  const { history, removeFromHistory, restoreConversation, clearAllHistory } = useChat();
  const [searchTerm, setSearchTerm] = useState('');

  const handleRemoveClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Do you want to delete this chat in history?`)) {
      removeFromHistory(index);
    }
  };

  const handleItemSelect = (conversation: Message[]) => {
    restoreConversation(conversation);
  };

  const handleClearAllClick = () => {
    if (window.confirm("Do you want to delete ALL chats?")) {
      clearAllHistory();
    }
  };

  // Lọc lịch sử theo từ khóa tìm kiếm
  const filteredHistory = history.filter(conversation => {
    if (!searchTerm) return true;
    return conversation.some(msg =>
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Nhóm lịch sử đã lọc theo nhãn thời gian
  const groupedHistory = groupHistoryByTime(filteredHistory);

  // Danh sách nhãn theo thứ tự ưu tiên (mới nhất trước)
  const timeLabelsOrder = ['Hôm nay', 'Hôm qua', 'Tuần này', 'Tháng này', 'Tháng trước', 'Cũ hơn'];

  // Sắp xếp các nhóm theo thứ tự ưu tiên
  const sortedGroups = timeLabelsOrder
    .filter(label => groupedHistory[label]) // Chỉ giữ các nhóm có dữ liệu
    .reduce((acc, label) => {
      acc[label] = groupedHistory[label];
      return acc;
    }, {} as { [key: string]: Message[][] });

  // Thêm các nhãn không có trong timeLabelsOrder nếu có (nếu logic tạo nhãn khác)
  Object.keys(groupedHistory).forEach(label => {
    if (!sortedGroups[label]) {
      sortedGroups[label] = groupedHistory[label];
    }
  });

  // Ép kiểu icon
  const SearchIcon = FiSearch as React.ComponentType<React.SVGProps<SVGSVGElement>>;

  return (
    <div className="conversation-history-sidebar">
      <h3>Chat History</h3>
      {/* Bao ô input và icon trong một container */}
      <div className="search-input-container">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search Chats..."
          className="search-input"
        />
        <SearchIcon className="search-input-icon" />
      </div>
      {history.length > 0 && (
        <button onClick={handleClearAllClick} className="clear-all-history-button">
          DELETE ALL
        </button>
      )}
      <ul className="history-list">
        {Object.keys(sortedGroups).length > 0 ? (
          Object.entries(sortedGroups).map(([label, conversations]) => (
            <React.Fragment key={label}>
              {/* Tiêu đề nhóm thời gian */}
              <li className="time-label-header">{label}</li>
              {/* Danh sách các đoạn chat trong nhóm */}
              {conversations.map((conversation, index) => {
                // Tìm index gốc trong history gốc để xóa
                const originalIndex = history.findIndex(conv => conv === conversation);
                return (
                  <li
                    key={originalIndex} // Dùng index gốc làm key
                    className="history-item"
                    onClick={() => handleItemSelect(conversation)}
                  >
                    <div className="history-preview">
                      {conversation[0] && (
                        <span className={`preview-sender ${conversation[0].sender}`}>
                          {conversation[0].sender === 'user' ? 'You: ' : 'AI: '}
                        </span>
                      )}
                      {conversation[0] && (
                        <span className="preview-text">
                          {conversation[0].content.length > 50
                            ? `${conversation[0].content.substring(0, 50)}...`
                            : conversation[0].content}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleRemoveClick(originalIndex, e)}
                      className="remove-history-button"
                    >
                      X
                    </button>
                  </li>
                );
              })}
            </React.Fragment>
          ))
        ) : (
          <li className="no-results">Not result found.</li>
        )}
      </ul>
      {history.length === 0 && Object.keys(groupedHistory).length === 0 && (
        <p></p>
      )}
    </div>
  );
};

export default ConversationHistorySidebar;