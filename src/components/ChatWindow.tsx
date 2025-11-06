import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { User, Message, Chat } from '../types';
import './ChatWindow.css';

interface ChatWindowProps {
  currentUser: User;
  chatId: string;
  onBack: () => void;
}

const ChatWindow = ({ currentUser, chatId, onBack }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [partner, setPartner] = useState<any>(null);
  const [chat, setChat] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lấy thông tin chat
    const chatRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const chatData = { id: docSnapshot.id, ...(docSnapshot.data() as any) } as Chat & { id: string };
        setChat(chatData);
        
        // Lấy thông tin partner
        const partnerId = chatData.participants.find((id: string) => id !== currentUser.uid);
        if (partnerId) {
          const userRef = doc(db, 'users', partnerId);
          onSnapshot(userRef, (userDoc) => {
            if (userDoc.exists()) {
              setPartner({ id: userDoc.id, ...userDoc.data() });
            }
          });
        }
      }
    });

    // Lấy messages
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Message[];
      setMessages(messagesList);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, currentUser.uid]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat) return;

    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        receiverId: chat.participants.find((id: string) => id !== currentUser.uid),
        timestamp: serverTimestamp(),
        createdAt: new Date()
      });

      // Cập nhật lastMessage trong chat
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: newMessage.trim(),
          senderId: currentUser.uid
        },
        lastMessageTime: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Lỗi gửi tin nhắn:', error);
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const messageDate = new Date(date);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    }
    
    return messageDate.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const groupMessagesByDate = () => {
    const grouped: { [key: string]: Message[] } = {};
    
    messages.forEach(message => {
      const dateKey = formatDate(message.timestamp);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(message);
    });
    
    return grouped;
  };

  if (!partner) {
    return (
      <div className="chat-window">
        <div className="loading-messages">Đang tải...</div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate();

  return (
    <div className="chat-window">
      <div className="chat-header">
        <button onClick={onBack} className="back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <img
          src={partner.photoURL || `https://ui-avatars.com/api/?name=${partner.displayName || partner.email}`}
          alt={partner.displayName || partner.email}
          className="chat-header-avatar"
        />
        <div className="chat-header-info">
          <span className="chat-header-name">{partner.displayName || partner.email}</span>
          <span className="chat-header-status">Trực tuyến</span>
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="empty-messages">
            <p>Chưa có tin nhắn nào</p>
            <p className="empty-hint">Bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
            <div key={dateKey}>
              <div className="date-divider">
                <span>{dateKey}</span>
              </div>
              {dateMessages.map((message) => {
                const isOwn = message.senderId === currentUser.uid;
                return (
                  <div
                    key={message.id}
                    className={`message ${isOwn ? 'own' : 'other'}`}
                  >
                    <div className="message-bubble">
                      <p className="message-text">{message.text}</p>
                      <span className="message-time">{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-container">
        <div className="message-input-wrapper">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="message-input"
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;

