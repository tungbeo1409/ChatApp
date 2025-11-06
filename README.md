# WhatsApp Clone - Chat App với Firebase

Ứng dụng chat giống WhatsApp được xây dựng với React, TypeScript và Firebase.

## Tính năng

- ✅ Đăng nhập/Đăng ký với Firebase Authentication
- ✅ Danh sách cuộc trò chuyện
- ✅ Gửi và nhận tin nhắn real-time
- ✅ Giao diện giống WhatsApp
- ✅ Responsive design

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Chạy ứng dụng:
```bash
npm run dev
```

3. Mở trình duyệt và truy cập: `http://localhost:5173`

## Cấu trúc dự án

```
src/
├── components/          # React components
│   ├── Login.tsx       # Component đăng nhập/đăng ký
│   ├── ChatList.tsx    # Danh sách cuộc trò chuyện
│   └── ChatWindow.tsx  # Cửa sổ chat
├── firebase/
│   └── config.ts       # Cấu hình Firebase
├── types/
│   └── index.ts        # TypeScript types
├── App.tsx             # Component chính
└── main.tsx            # Entry point
```

## Firebase Setup

Ứng dụng đã được cấu hình với Firebase của bạn. Bạn cần:

1. Bật **Authentication** trong Firebase Console:
   - Vào Firebase Console > Authentication > Sign-in method
   - Bật **Email/Password**

2. Tạo Firestore Database:
   - Vào Firebase Console > Firestore Database
   - Tạo database ở chế độ **Test mode** hoặc **Production mode**
   - Tạo collection `users` và `chats`

3. Cấu trúc Firestore:
   - `users/{userId}` - Thông tin người dùng
   - `chats/{chatId}` - Thông tin cuộc trò chuyện
   - `chats/{chatId}/messages/{messageId}` - Tin nhắn

## Lưu ý

- Đảm bảo Firestore Security Rules cho phép đọc/ghi dữ liệu
- Có thể cần cập nhật Security Rules trong Firebase Console

