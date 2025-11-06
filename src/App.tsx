import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import Login from './components/Login';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import './App.css';

function App() {
  const [user, setUser] = useState<any>(null);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedChat(null);
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="user-info">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`} 
              alt="Avatar" 
              className="user-avatar"
            />
            <span className="user-name">{user.displayName || user.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Đăng xuất
          </button>
        </div>
        <ChatList 
          currentUser={user} 
          onSelectChat={setSelectedChat}
          selectedChatId={selectedChat}
        />
      </div>
      <div className="main-content">
        {selectedChat ? (
          <ChatWindow 
            currentUser={user} 
            chatId={selectedChat}
            onBack={() => setSelectedChat(null)}
          />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <h1>Chào mừng đến với WhatsApp Clone</h1>
              <p>Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

