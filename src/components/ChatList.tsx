import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from '../types';
import './ChatList.css';

interface ChatListProps {
  currentUser: User;
  onSelectChat: (chatId: string) => void;
  selectedChatId: string | null;
}

const ChatList = ({ currentUser, onSelectChat, selectedChatId }: ChatListProps) => {
  const [chats, setChats] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [composeForUser, setComposeForUser] = useState<any | null>(null);
  const [composeMessage, setComposeMessage] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    // Lấy danh sách tất cả users
    const usersRef = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersRef, (snapshot) => {
      const usersList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.id !== currentUser.uid);
      setUsers(usersList);
    });

    // Lấy danh sách chats của user hiện tại
    const chatsRef = collection(db, 'chats');
    const qPrimary = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc')
    );

    // Fallback khi thiếu index: bỏ orderBy
    let unsubscribeChats: (() => void) | null = null;
    const handleSnapshot = (snapshot: any) => {
      const chatsList = snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() }));
      setChats(chatsList);
    };

    unsubscribeChats = onSnapshot(
      qPrimary,
      handleSnapshot,
      (error) => {
        // Thiếu index => fallback không orderBy để vẫn hiện danh sách
        if ((error as any)?.code === 'failed-precondition') {
          const qFallback = query(
            chatsRef,
            where('participants', 'array-contains', currentUser.uid)
          );
          if (unsubscribeChats) unsubscribeChats();
          unsubscribeChats = onSnapshot(qFallback, handleSnapshot);
        } else {
          console.error('Lỗi lấy danh sách chat:', error);
        }
      }
    );

    return () => {
      unsubscribeUsers();
      if (unsubscribeChats) unsubscribeChats();
    };
  }, [currentUser.uid]);

  // Tạo chat mới sẽ được xử lý trong handleSendQuickMessage khi cần

  const handleOpenCompose = (user: any) => {
    setComposeForUser(user);
    setComposeMessage('');
  };

  useEffect(() => {
    if (showUserList) {
      setUserSearchTerm('');
      setModalError('');
    }
  }, [showUserList]);

  const handleSendQuickMessage = async () => {
    if (!composeForUser || !composeMessage.trim()) return;
    try {
      // Tìm hoặc tạo chat
      const existingChat = chats.find(chat => 
        chat.participants.includes(composeForUser.id) && 
        chat.participants.length === 2
      );

      let chatId = existingChat?.id as string | undefined;
      if (!chatId) {
        const newChat = {
          participants: [currentUser.uid, composeForUser.id],
          createdAt: new Date(),
          lastMessageTime: serverTimestamp(),
          lastMessage: { text: composeMessage.trim(), senderId: currentUser.uid }
        };
        const chatRef = await addDoc(collection(db, 'chats'), newChat);
        chatId = chatRef.id;
      }

      // Gửi tin nhắn đầu tiên
      const messagesRef = collection(db, 'chats', chatId!, 'messages');
      await addDoc(messagesRef, {
        text: composeMessage.trim(),
        senderId: currentUser.uid,
        receiverId: composeForUser.id,
        timestamp: serverTimestamp(),
        createdAt: new Date()
      });

      // Cập nhật lastMessage
      await updateDoc(doc(db, 'chats', chatId!), {
        lastMessage: {
          text: composeMessage.trim(),
          senderId: currentUser.uid
        },
        lastMessageTime: serverTimestamp()
      });

      // Đóng composer và mở cửa sổ chat
      setComposeForUser(null);
      setComposeMessage('');
      setShowUserList(false);
      onSelectChat(chatId!);
    } catch (error) {
      console.error('Lỗi gửi tin nhắn nhanh:', error);
    }
  };

  const getChatPartner = (chat: any) => {
    const partnerId = chat.participants.find((id: string) => id !== currentUser.uid);
    return users.find(user => user.id === partnerId);
  };

  // Bộ lọc tại ô tìm phía trên sidebar (giữ để lọc nhanh danh sách hiển thị)
  // Hiện tại không dùng trực tiếp, nhưng giữ logic nếu muốn mở rộng

  const filteredUsersInModal = users.filter(user =>
    (user.displayName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleFindByEmail = async () => {
    setModalError('');
    const email = userSearchTerm.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setModalError('Nhập email hợp lệ để tìm.');
      return;
    }
    try {
      // Vì đã có snapshot tất cả users, thử tìm local trước
      const local = users.find((u) => (u.email || '').toLowerCase() === email);
      if (local) {
        handleOpenCompose(local);
        return;
      }
      // Nếu không có trong bộ nhớ, có thể rules giới hạn; thử query trực tiếp
      // Lưu ý: Nếu rules chặn, sẽ bắt lỗi và hiển thị thông báo
      const usersCol = collection(db, 'users');
      const qByEmail = query(usersCol, where('email', '==', email));
      const unsub = onSnapshot(qByEmail, (snap) => {
        unsub();
        if (snap.empty) {
          setModalError('Không tìm thấy người dùng với email này.');
          return;
        }
        const docData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        handleOpenCompose(docData);
      }, (err) => {
        setModalError('Không thể tìm theo email. Kiểm tra quyền đọc Firestore.');
        console.error(err);
      });
    } catch (e) {
      setModalError('Có lỗi khi tìm theo email.');
      console.error(e);
    }
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <button 
          className="new-chat-btn"
          onClick={() => setShowUserList(true)}
          title="Cuộc trò chuyện mới"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
        <input
          type="text"
          placeholder="Tìm kiếm hoặc bắt đầu cuộc trò chuyện mới"
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {showUserList && (
        <div className="user-list-overlay">
          <div className="user-list-modal">
            <div className="user-list-header">
              <h3>Chọn người để nhắn tin</h3>
              <button onClick={() => setShowUserList(false)} className="close-btn">×</button>
            </div>
            <div className="user-list-search">
              <input
                type="text"
                placeholder="Tìm theo tên hoặc email..."
                className="user-search-input"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <div className="user-list-content">
              {filteredUsersInModal.length === 0 ? (
                <div className="empty-state">
                  <div>Không tìm thấy người dùng</div>
                  <div className="empty-actions">
                    <button className="find-by-email-btn" onClick={handleFindByEmail}>Tìm theo email</button>
                  </div>
                  {modalError && <div className="error-text">{modalError}</div>}
                </div>
              ) : (
                filteredUsersInModal.map(user => (
                  <div
                    key={user.id}
                    className="user-item"
                    onClick={() => handleOpenCompose(user)}
                  >
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email}`}
                      alt={user.displayName || user.email}
                      className="user-avatar-small"
                    />
                    <div className="user-info-small">
                      <div className="user-name-small">{user.displayName || user.email}</div>
                      <div className="user-email-small">{user.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {composeForUser && (
        <div className="compose-overlay">
          <div className="compose-modal">
            <div className="compose-header">
              <div className="compose-user">
                <img
                  src={composeForUser.photoURL || `https://ui-avatars.com/api/?name=${composeForUser.displayName || composeForUser.email}`}
                  alt={composeForUser.displayName || composeForUser.email}
                  className="user-avatar-small"
                />
                <div className="user-info-small">
                  <div className="user-name-small">{composeForUser.displayName || composeForUser.email}</div>
                  <div className="user-email-small">{composeForUser.email}</div>
                </div>
              </div>
              <button className="close-btn" onClick={() => setComposeForUser(null)}>×</button>
            </div>
            <div className="compose-body">
              <input
                type="text"
                className="compose-input"
                placeholder="Nhập tin nhắn đầu tiên..."
                value={composeMessage}
                onChange={(e) => setComposeMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendQuickMessage(); }}
                autoFocus
              />
              <button 
                className="compose-send-btn"
                onClick={handleSendQuickMessage}
                disabled={!composeMessage.trim()}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="chat-items">
        {chats.length === 0 ? (
          <div className="empty-chats">
            <p>Chưa có cuộc trò chuyện nào</p>
            <p className="empty-hint">Nhấn vào nút + để bắt đầu</p>
          </div>
        ) : (
          chats.map(chat => {
            const partner = getChatPartner(chat);
            if (!partner) return null;

            return (
              <div
                key={chat.id}
                className={`chat-item ${selectedChatId === chat.id ? 'active' : ''}`}
                onClick={() => onSelectChat(chat.id)}
              >
                <img
                  src={partner.photoURL || `https://ui-avatars.com/api/?name=${partner.displayName || partner.email}`}
                  alt={partner.displayName || partner.email}
                  className="chat-avatar"
                />
                <div className="chat-info">
                  <div className="chat-header-info">
                    <span className="chat-name">{partner.displayName || partner.email}</span>
                    {chat.lastMessageTime && (
                      <span className="chat-time">
                        {new Date(chat.lastMessageTime.seconds * 1000).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                  </div>
                  <div className="chat-last-message">
                    {chat.lastMessage ? (
                      <span>{chat.lastMessage.text || 'Hình ảnh'}</span>
                    ) : (
                      <span className="no-message">Chưa có tin nhắn</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatList;

