# 📱 Ecommerce Mobile App

Ứng dụng thương mại điện tử đa nền tảng được xây dựng bằng **React Native + Expo**, hỗ trợ cả người mua (Buyer) và người bán (Seller). Cung cấp đầy đủ tính năng mua sắm, nhắn tin thời gian thực, quản lý đơn hàng và hồ sơ người dùng.

---

## 🚀 Yêu cầu hệ thống

| Công cụ | Phiên bản |
|---|---|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Expo CLI | SDK 54 |
| Android Studio / Emulator | API 34+ (khuyến nghị) |
| Expo Go App | ≥ 2.x (cài trên điện thoại) |

---

## ⚙️ Cài đặt & Khởi chạy

### 1. Cài đặt dependencies

```bash
cd ecommerce-mobile
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc:

```env
# URL của Backend API Gateway (thay bằng IP máy tính của bạn)
# Máy ảo Android Emulator:  http://10.0.2.2:8080
# Điện thoại thật (cùng WiFi): http://192.168.x.x:8080
EXPO_PUBLIC_API_URL=http://192.168.1.41:8080/api

# URL của Chat Service (Socket.IO)
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.41:8088

# Tên S3 Bucket (dùng cho upload ảnh chat)
EXPO_PUBLIC_S3_BUCKET=ecommerce-chat-service

# Độ dài mã OTP xác thực email
EXPO_PUBLIC_OTP_LENGTH=6
```

> ⚠️ **Lưu ý quan trọng**: Nếu bạn chạy trên điện thoại thật, hãy dùng địa chỉ IP LAN của máy tính (xem bằng lệnh `ipconfig` trên Windows). Không dùng `localhost`.

### 3. Khởi chạy ứng dụng

```bash
# Khởi chạy với cache cleared (khuyến nghị lần đầu)
npx expo start -c

# Hoặc khởi chạy bình thường
npx expo start
```

Sau khi server khởi động, nhấn:
- `a` → Mở trên Android Emulator
- `i` → Mở trên iOS Simulator  
- Quét QR Code bằng app **Expo Go** trên điện thoại thật

---

## 📁 Cấu trúc dự án

```
ecommerce-mobile/
├── src/
│   ├── api/                   # Axios client & API helpers
│   │   └── client.ts          # Cấu hình base URL, interceptors (token, refresh)
│   ├── components/            # UI Components dùng chung
│   ├── constants/             # Màu sắc, font, kích thước chuẩn (COLORS, FONTS...)
│   ├── contexts/              # React Context (authContext)
│   ├── features/              # Logic nghiệp vụ theo module
│   │   ├── notification/      # APIs & hooks thông báo
│   │   ├── order/             # APIs đơn hàng (getOrders, getOrderById...)
│   │   ├── product/           # APIs sản phẩm
│   │   └── user/              # APIs thông tin người dùng
│   ├── navigation/            # Cấu hình điều hướng React Navigation
│   │   ├── AuthStack.tsx      # Stack: Login → Register → ForgotPassword → VerifyEmail
│   │   ├── MainTabs.tsx       # Bottom Tabs chính: Home, Cart, Chat, Profile
│   │   ├── HomeStack.tsx      # Tab Home → ProductDetail...
│   │   ├── CartStack.tsx      # Tab Cart → Checkout...
│   │   ├── ChatStack.tsx      # Tab Chat → ChatScreen (room nhắn tin)
│   │   └── ProfileStack.tsx   # Tab Profile → Settings...
│   ├── screens/               # Màn hình ứng dụng
│   │   ├── HomeScreen.tsx     # Trang chủ, tìm kiếm sản phẩm
│   │   ├── NotificationScreen.tsx
│   │   ├── auth/              # Đăng nhập / Đăng ký / Quên mật khẩu
│   │   ├── cart/              # Giỏ hàng
│   │   ├── chat/
│   │   │   ├── ChatListScreen.tsx      # Danh sách cuộc trò chuyện
│   │   │   ├── ChatScreen.tsx          # Phòng nhắn tin (tin nhắn, voice, hình ảnh, hóa đơn)
│   │   │   └── InvoiceModal.tsx        # Modal chọn & gửi hóa đơn đơn hàng
│   │   ├── product/           # Chi tiết sản phẩm
│   │   └── user/              # Hồ sơ, cài đặt tài khoản
│   ├── services/
│   │   ├── socket/
│   │   │   └── socketService.ts  # Socket.IO client (tin nhắn, reaction, thu hồi)
│   │   ├── sqlite/
│   │   │   └── database.ts       # SQLite local cache tin nhắn (expo-sqlite)
│   │   └── upload/
│   │       └── attachmentService.ts  # Upload ảnh & âm thanh lên Chat Service
│   ├── store/                 # Zustand global state
│   └── types/                 # TypeScript type definitions
├── .env                       # Biến môi trường (xem phần cài đặt)
├── app.json                   # Cấu hình Expo / app metadata
├── babel.config.js
├── package.json
└── tsconfig.json
```

---

## ✨ Tính năng nổi bật

### 🛍️ Mua sắm
- Xem danh sách & chi tiết sản phẩm
- Thêm vào giỏ hàng, đặt hàng
- Xem lịch sử & trạng thái đơn hàng

### 💬 Nhắn tin thời gian thực (Chat)
| Tính năng | Mô tả |
|---|---|
| 📝 Tin nhắn văn bản | Gõ và gửi ngay lập tức qua Socket.IO |
| 🖼️ Gửi ảnh | Chọn ảnh từ thư viện, upload lên S3 |
| 🎤 Gửi Voice | Ghi âm và gửi tin nhắn thoại (expo-av) |
| 🧾 Gửi Hóa đơn | Chọn đơn hàng từ danh sách và gửi vào chat |
| ❤️ Reactions | Thả cảm xúc vào tin nhắn, cập nhật thời gian thực |
| 🔄 Thu hồi | Thu hồi tin nhắn đã gửi |
| ↪️ Chuyển tiếp | Forward tin nhắn sang cuộc trò chuyện khác |
| 🗑️ Xóa | Xóa tin nhắn phía người dùng |
| 📞 Cuộc gọi | Xem lịch sử Voice/Video Call (UI ready) |
| 🔍 Xem ảnh | Nhấn vào ảnh để xem toàn màn hình |
| 💾 Cache offline | Tin nhắn được lưu cục bộ bằng SQLite |

### 👤 Tài khoản
- Đăng ký / Đăng nhập / Quên mật khẩu
- Xác thực Email bằng OTP
- Quản lý hồ sơ cá nhân
- Xem thông báo

---

## 📦 Dependencies chính

| Package | Mục đích |
|---|---|
| `expo` ~54.0 | Framework Expo |
| `react-native` 0.81.5 | Core framework |
| `react-navigation` v7 | Điều hướng màn hình |
| `socket.io-client` ^4.8 | Kết nối realtime WebSocket |
| `expo-av` | Ghi âm & phát audio |
| `expo-image-picker` | Chọn ảnh từ thư viện |
| `expo-sqlite` | Database SQLite cục bộ |
| `expo-secure-store` | Lưu token an toàn |
| `expo-clipboard` | Copy tin nhắn |
| `axios` ^1.15 | HTTP Client |
| `zustand` ^5.0 | State management (tối giản) |
| `react-hook-form` + `zod` | Form validation |
| `dayjs` | Định dạng thời gian |
| `lucide-react-native` | Icon library |
| `nativewind` 4.2 | Tailwind CSS cho React Native |

---

## 🌐 Kết nối Backend

Ứng dụng kết nối với nhiều microservice thông qua API Gateway:

| Service | Port | Mô tả |
|---|---|---|
| API Gateway | `:8080` | Điểm vào duy nhất cho REST API |
| Chat Service | `:8088` | WebSocket (Socket.IO) & REST upload |

### 🔐 Xác thực
- **JWT Bearer Token** được lưu trong `expo-secure-store`
- Tự động **refresh token** khi nhận lỗi 401
- Token được gắn tự động vào mọi request qua Axios interceptor

---

## 🔧 Scripts

```bash
npm start          # Khởi chạy Expo Dev Server
npm run android    # Mở trực tiếp trên Android
npm run ios        # Mở trực tiếp trên iOS
npm run web        # Chạy trên trình duyệt (hạn chế)
```

---

## 🐞 Xử lý lỗi thường gặp

### ❌ Network request failed
- Kiểm tra `EXPO_PUBLIC_API_URL` có đúng IP LAN không.
- Đảm bảo Backend đang chạy và cùng mạng WiFi với điện thoại.

### ❌ Expo Bundling Error (Red screen)
```bash
# Xóa cache và khởi động lại
npx expo start -c
```

### ❌ Cannot connect to Socket
- Kiểm tra `EXPO_PUBLIC_SOCKET_URL` trỏ đúng IP và port `8088`.
- Chat Service phải đang chạy trong Docker.

---

## 📝 Ghi chú phát triển

- **NativeWind v4**: Dự án sử dụng TailwindCSS thông qua NativeWind. Một số class có thể khác so với web Tailwind chuẩn.
- **Expo Go vs Dev Build**: Một số tính năng native nâng cao (như WebRTC cho Video Call) sẽ cần **Dev Build** hoặc **Standalone Build**, không hỗ trợ Expo Go.
- **SQLite Cache**: Tin nhắn được cache cục bộ để hiển thị nhanh, sau đó đồng bộ với API.

---

## 👨‍💻 Nhóm phát triển

Được xây dựng như một phần của hệ thống **Ecommerce Microservices** gồm:
- `ecommerce-mobile` → React Native (repo này)
- `ecommerce-frontend` → React Web (Vite)
- `ecommerce-backend` → Spring Boot Microservices + Node.js Chat Service
