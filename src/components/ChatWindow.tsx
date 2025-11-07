import { useState, useEffect, useRef, ChangeEvent } from 'react';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
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
  const [chat, setChat] = useState<(Chat & { id: string }) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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

  const handleAttachmentUpload = async (file: File, type: 'image' | 'file') => {
    if (!chat) return;
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File quá lớn (tối đa 10MB).');
      return;
    }

    const receiverId = chat.participants.find((id: string) => id !== currentUser.uid);
    if (!receiverId) return;

    try {
      setUploadError('');
      setUploading(true);

      const storageRef = ref(storage, `chats/${chatId}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const caption = newMessage.trim();
      const messagePayload: any = {
        senderId: currentUser.uid,
        receiverId,
        timestamp: serverTimestamp(),
        createdAt: new Date(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: downloadURL
      };

      if (caption) {
        messagePayload.text = caption;
      }

      if (type === 'image') {
        messagePayload.imageUrl = downloadURL;
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), messagePayload);

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: {
          text: caption || (type === 'image' ? 'Đã gửi một hình ảnh' : file.name || 'Đã gửi một tệp'),
          senderId: currentUser.uid,
          imageUrl: type === 'image' ? downloadURL : undefined,
          fileName: type === 'file' ? file.name : undefined,
          type
        },
        lastMessageTime: serverTimestamp()
      });

      if (caption) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Lỗi gửi tệp:', error);
      setUploadError('Không thể gửi tệp. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAttachmentUpload(file, 'image');
    }
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAttachmentUpload(file, 'file');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openImagePicker = () => {
    imageInputRef.current?.click();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chat) return;

    try {
      setUploadError('');
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const receiverId = chat.participants.find((id: string) => id !== currentUser.uid);
      if (!receiverId) return;
      await addDoc(messagesRef, {
        text: newMessage.trim(),
        senderId: currentUser.uid,
        receiverId,
        timestamp: serverTimestamp(),
        createdAt: new Date()
      });

      // Cập nhật lastMessage trong chat
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: {
          text: newMessage.trim(),
          senderId: currentUser.uid,
          type: 'text'
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

  const formatFileSize = (size?: number) => {
    if (!size) return '';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
                const fileSizeLabel = formatFileSize(message.fileSize);
                const timeLabel = formatTime(message.timestamp);
                return (
                  <div
                    key={message.id}
                    className={`message ${isOwn ? 'own' : 'other'}`}
                  >
                    <div className="message-bubble">
                      {message.imageUrl && (
                        <a
                          href={message.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="message-image-wrapper"
                        >
                          <img src={message.imageUrl} alt="Hình ảnh" className="message-image" />
                        </a>
                      )}

                      {message.fileUrl && !message.imageUrl && (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="message-file"
                        >
                          <div className="file-icon">📎</div>
                          <div className="file-info">
                            <span className="file-name">{message.fileName || 'Tệp đính kèm'}</span>
                            {fileSizeLabel && (
                              <span className="file-size">{fileSizeLabel}</span>
                            )}
                          </div>
                        </a>
                      )}

                      {message.text && (
                        <p className="message-text">{message.text}</p>
                      )}

                      <div className="message-meta">
                        <span className="message-time">{timeLabel}</span>
                      </div>
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
        <input
          type="file"
          accept="image/*"
          ref={imageInputRef}
          className="hidden-file-input"
          onChange={handleImageChange}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden-file-input"
          onChange={handleFileChange}
        />

        {uploadError && <div className="upload-error">{uploadError}</div>}
        {uploading && <div className="upload-status">Đang gửi tệp...</div>}

        <div className="message-input-wrapper">
          <div className="attachment-actions">
            <button
              type="button"
              className="attachment-btn"
              onClick={openFilePicker}
              title="Gửi tệp"
              disabled={uploading}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 6.5l-5.79 5.79a2 2 0 01-2.83-2.83l6.1-6.1a4 4 0 015.66 5.66l-7.07 7.07a6 6 0 11-8.49-8.49l5.66-5.66" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              type="button"
              className="attachment-btn"
              onClick={openImagePicker}
              title="Gửi hình ảnh"
              disabled={uploading}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17l4.5-4.5L12 17l3-3 6 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7.5" r="1.5" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn hoặc chú thích cho tệp..."
            className="message-input"
            disabled={uploading}
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim() || uploading}>
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

