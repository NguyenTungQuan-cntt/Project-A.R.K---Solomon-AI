// src/components/Sidebar.tsx
import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/sidebar.css';

const Sidebar: React.FC = () => {
  const { userInfo, updateUserInfo, clearAllHistory } = useChat(); // Lấy userInfo và updateUserInfo từ context
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = () => {
    console.log("Đăng xuất...");
    // window.location.href = '/login';
  };

  const handleSettings = () => {
    console.log("Mở Cài đặt...");
  };

  const handleAccountManagement = () => {
    console.log("Mở Quản lý tài khoản...");
    // Ví dụ: Cập nhật tên người dùng
    updateUserInfo({ name: "Time Memories" });

    // Ví dụ: Cập nhật avatar
    updateUserInfo({ avatar: "https://placehold.co/600x400/853332/AB9998/png" });
  };

  const handleClearAllHistory = () => {
    if (window.confirm("Do you want to delete ALL chat in history?")) {
      clearAllHistory();
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Solomon</h2>
        <p>Ask me anything!</p>
        <div className="sidebar-info">
          <p>This is a demo chatbot.</p>
          <p>It simulates AI responses.</p>
        </div>
      </div>

      <div className="user-info-section">
        <div className="user-info" onClick={toggleUserMenu}>
          <img src={userInfo.avatar} alt="User Avatar" className="user-avatar" />
          <span className="user-name">{userInfo.name}</span>
        </div>
        {showUserMenu && (
          <div className="user-menu">
            <button className="user-menu-item" onClick={handleSettings}>
              Cài đặt
            </button>
            <button className="user-menu-item" onClick={handleAccountManagement}>
              Quản lý tài khoản
            </button>
            <button className="user-menu-item" onClick={handleClearAllHistory}>
              Xóa toàn bộ lịch sử chat
            </button>
            <hr className="menu-divider" />
            <button className="user-menu-item logout" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;