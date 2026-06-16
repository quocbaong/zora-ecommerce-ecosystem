# PROMPT: Thiết kế và Code Chat Service (Node.js)

## Bối cảnh hệ thống

Đây là một phần của hệ thống E-Commerce dạng Microservices.
Các service hiện tại gồm: `auth-service`, `product-service`, `gateway-service` (Spring Boot + Java).
Hệ thống dùng: PostgreSQL, Redis, Kafka, AWS S3, Docker Compose, JWT Authentication.

Gateway chạy trên cổng `8080`. JWT Secret dùng chung qua biến môi trường `JWT_SECRET`.
Gateway inject `X-User-Id` và `X-Role` vào header sau khi xác thực JWT.

---

## Yêu cầu

- Chat **realtime** giữa **User (người mua)** và **Seller (người bán)**.
- Cả User và Seller đều có thể **khởi tạo cuộc trò chuyện trước**.
- Chat được mở khi **User xem sản phẩm** hoặc **sau khi đặt hàng**.
- Cho phép gửi **ảnh/file** trong chat (lưu trên AWS S3).
- **Lịch sử chat lưu 30 ngày** (dùng TTL của DynamoDB).
- **Số lượng đồng thời < 1.000 user** → không cần scale phức tạp.
- **ADMIN không được xem** nội dung chat.
- **Seller = 1 tài khoản duy nhất**, không có team/nhân viên.
- Gửi **Push Notification + Badge** khi có tin nhắn mới (qua Kafka → notification-service).
- **Database**: AWS DynamoDB.
- **File Storage**: AWS S3 bucket riêng cho chat.
- **Message Queue**: Kafka (gửi notification event, đồng bộ data).

---

## Công nghệ

- **Runtime**: Node.js 20 (LTS)
- **Framework**: Express.js
- **Realtime**: Socket.IO
- **Database**: AWS DynamoDB (AWS SDK v3)
- **Storage**: AWS S3
- **Messaging**: Kafka (KafkaJS)
- **Auth**: JWT (jsonwebtoken)
- **Container**: Docker

---

## Cấu trúc thư mục

```
chat-service/
├── src/
│   ├── config/
│   │   ├── dynamodb.js        # DynamoDB client
│   │   ├── s3.js              # S3 client
│   │   ├── kafka.js           # Kafka producer/consumer
│   │   └── socket.js          # Socket.IO setup + auth middleware
│   ├── middleware/
│   │   └── authMiddleware.js  # Lấy X-User-Id, X-Role từ header
│   ├── models/
│   │   ├── conversationModel.js   # CRUD DynamoDB cho conversations
│   │   └── messageModel.js        # CRUD DynamoDB cho messages
│   ├── services/
│   │   ├── chatService.js         # Business logic
│   │   ├── uploadService.js       # Upload file lên S3
│   │   └── notificationService.js # Publish Kafka event
│   ├── controllers/
│   │   ├── chatController.js
│   │   └── uploadController.js
│   ├── routes/
│   │   └── index.js
│   ├── sockets/
│   │   └── chatSocket.js      # Socket.IO event handlers
│   └── app.js
├── Dockerfile
├── package.json
├── .env.example
└── DESIGN_PROMPT.md
```

---

## DynamoDB Schema

### Bảng: `chat_conversations`

```
PK (Partition Key) : "USER#{userId}"       ← truy vấn danh sách hội thoại của User
SK (Sort Key)      : "CONV#{conversationId}"

Attributes:
  conversationId  : String (UUID)
  sellerId        : String (UUID)
  userId          : String (UUID)
  productId       : String (UUID)
  lastMessage     : String
  lastMessageAt   : Number (Unix timestamp ms)
  unreadUser      : Number (số tin User chưa đọc)
  unreadSeller    : Number (số tin Seller chưa đọc)
  ttl             : Number (Unix timestamp giây = now + 30 ngày)

GSI1 (Global Secondary Index):
  PK: "SELLER#{sellerId}"
  SK: "CONV#{conversationId}"
  → Để Seller xem danh sách hội thoại của họ
```

### Bảng: `chat_messages`

```
PK : "CONV#{conversationId}"
SK : "MSG#{ISO8601Timestamp}#{messageId}"   ← sort theo thời gian

Attributes:
  messageId  : String (UUID)
  senderId   : String (UUID)
  senderRole : String ("USER" | "SELLER")
  type       : String ("TEXT" | "IMAGE")
  content    : String (text hoặc S3 URL)
  readBy     : List<String>
  ttl        : Number (Unix timestamp giây = now + 30 ngày)
```

---

## API REST (mount tại `/chat`)

| Method | Path | Role | Mô tả |
|--------|------|------|--------|
| `POST` | `/conversations` | USER, SELLER | Tạo hoặc lấy lại conversation |
| `GET`  | `/conversations` | USER, SELLER | Danh sách hội thoại của mình |
| `GET`  | `/conversations/:id` | USER, SELLER | Chi tiết 1 conversation |
| `GET`  | `/conversations/:id/messages` | USER, SELLER | Lịch sử tin nhắn (phân trang bằng `lastKey`) |
| `POST` | `/conversations/:id/messages` | USER, SELLER | Gửi tin nhắn (HTTP fallback, không realtime) |
| `PUT`  | `/conversations/:id/read` | USER, SELLER | Đánh dấu đã đọc, reset unreadCount |
| `POST` | `/upload` | USER, SELLER | Upload ảnh/file → nhận S3 URL |

### Body mẫu `POST /conversations`:
```json
{
  "productId": "uuid",
  "sellerId": "uuid"
}
```

### Body mẫu `POST /conversations/:id/messages`:
```json
{
  "type": "TEXT",
  "content": "Sản phẩm này còn hàng không?"
}
```

---

## WebSocket Events (Socket.IO)

Client kết nối thẳng tới `ws://chat-service:8088` với JWT trong `auth.token`.

### Client → Server
| Event | Payload | Mô tả |
|-------|---------|--------|
| `join_conversation` | `{ conversationId }` | Vào phòng chat |
| `send_message` | `{ conversationId, type, content }` | Gửi tin nhắn |
| `typing` | `{ conversationId }` | Đang gõ chữ |
| `mark_read` | `{ conversationId }` | Đánh dấu đã đọc |

### Server → Client
| Event | Payload | Mô tả |
|-------|---------|--------|
| `new_message` | `{ message }` | Tin nhắn mới |
| `user_typing` | `{ senderId, senderRole }` | Thông báo đang gõ |
| `message_read` | `{ conversationId, userId }` | Đã đọc |

---

## Xác thực

### REST API (qua Gateway)
```js
// authMiddleware.js
module.exports = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const role   = req.headers['x-role'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId   = userId;
  req.userRole = role;
  next();
};
```

### WebSocket (kết nối trực tiếp, không qua Gateway)
```js
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId   = payload.sub;
    socket.userRole = payload.role;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
});
```

---

## Kafka Event (Publish khi có tin nhắn mới)

**Topic**: `chat.message.sent`

```json
{
  "event": "NEW_MESSAGE",
  "toUserId": "uuid",
  "fromUserId": "uuid",
  "conversationId": "uuid",
  "preview": "50 ký tự đầu của tin...",
  "type": "TEXT",
  "timestamp": 1710000000000
}
```

`notification-service` consume topic này và gửi Push Notification/Badge cho người nhận.

---

## S3 Upload Flow

```
1. Client gọi POST /chat/upload với file (multipart/form-data)
2. chat-service upload lên S3 bucket: ecommerce-chat-media
3. Đường dẫn S3: chat-media/{conversationId}/{timestamp}_{uuid}_{filename}
4. Trả về: { url: "https://..." }
5. Client gửi socket event send_message với type=IMAGE, content=url
```

---

## Cấu hình Docker

```yaml
# Thêm vào docker-compose.yml

  chat-service:
    build: ./chat-service
    container_name: chat-service
    networks:
      - app-network
    ports:
      - "8088:8088"
    env_file:
      - .env
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=ap-southeast-1
      - DYNAMODB_TABLE_CONVERSATIONS=chat_conversations
      - DYNAMODB_TABLE_MESSAGES=chat_messages
      - S3_BUCKET_CHAT=ecommerce-chat-media
      - KAFKA_SERVER=kafka:29092
      - PORT=8088
    depends_on:
      - kafka
```

---

## Cấu hình Gateway

```yaml
# Thêm vào gateway-service/src/main/resources/application.yml

- id: chat-service
  uri: http://${CHAT_SERVICE_URL:chat-service:8088}
  predicates:
    - Path=/api/chat/**
  filters:
    - RewritePath=/api/chat(?<segment>/?.*), /chat$\{segment}
```

> **Lưu ý**: WebSocket KHÔNG đi qua Gateway. Client kết nối trực tiếp tới `ws://host:8088` với JWT token trong `socket.handshake.auth.token`.

---

## Hướng dẫn Code cho AI

Hãy code `chat-service` theo đúng cấu trúc thư mục trên. Thực hiện tuần tự:

1. `package.json` với dependencies đầy đủ
2. `.env.example`
3. `src/config/` — DynamoDB, S3, Kafka, Socket.IO
4. `src/middleware/authMiddleware.js`
5. `src/models/` — conversationModel.js, messageModel.js
6. `src/services/` — chatService.js, uploadService.js, notificationService.js
7. `src/controllers/` — chatController.js, uploadController.js
8. `src/routes/index.js`
9. `src/sockets/chatSocket.js`
10. `src/app.js`
11. `Dockerfile`

---

## 🗂️ Kế hoạch triển khai — Chia Module

### **Module 1: Project Bootstrap**
- [ ] Tạo `package.json` với dependencies: `express`, `socket.io`, `@aws-sdk/client-dynamodb`, `@aws-sdk/client-s3`, `kafkajs`, `jsonwebtoken`, `multer`, `uuid`, `dotenv`
- [ ] Tạo `.env.example` với tất cả biến môi trường
- [ ] Tạo cấu trúc thư mục chuẩn
- [ ] Tạo `Dockerfile` và đăng ký vào `docker-compose.yml`

### **Module 2: Config & Middleware**
- [ ] `src/config/dynamodb.js` — DynamoDB client (AWS SDK v3)
- [ ] `src/config/s3.js` — S3 client
- [ ] `src/config/kafka.js` — Kafka producer
- [ ] `src/middleware/authMiddleware.js` — đọc `X-User-Id`, `X-Role` từ header

### **Module 3: DynamoDB Models**
- [ ] `conversationModel.js` — CRUD bảng `chat_conversations`
- [ ] `messageModel.js` — CRUD bảng `chat_messages`, phân trang bằng `lastKey`

### **Module 4: REST API**
- [ ] `chatService.js` — business logic (tạo/lấy conversation, gửi message, đánh dấu đã đọc)
- [ ] `chatController.js` — xử lý các route REST
- [ ] `src/routes/index.js` — mount routes tại `/chat`
- [ ] `src/app.js` — khởi tạo Express app
> ✅ Sau module này có thể test REST API qua Postman

### **Module 5: File Upload**
- [ ] `uploadService.js` — upload lên S3 `ecommerce-chat-media`, path `chat-media/{conversationId}/{timestamp}_{uuid}_{filename}`
- [ ] `uploadController.js` — `POST /upload`, trả về `{ url }`

### **Module 6: WebSocket (Realtime)**
- [ ] `src/config/socket.js` — Socket.IO setup + JWT middleware (kết nối trực tiếp, không qua Gateway)
- [ ] `src/sockets/chatSocket.js` — xử lý events: `join_conversation`, `send_message`, `typing`, `mark_read`

### **Module 7: Kafka Notification**
- [ ] `notificationService.js` — publish `NEW_MESSAGE` lên topic `chat.message.sent`
- [ ] Tích hợp vào `chatService.js` (cả REST lẫn WebSocket)

### **Module 8: Gateway & Integration**
- [ ] Thêm route `chat-service` vào `gateway-service/src/main/resources/application.yml`
- [ ] Test end-to-end: REST qua Gateway + WebSocket trực tiếp `ws://localhost:8088`
- [ ] Update Postman collection với Chat APIs

---
> **Thứ tự thực hiện**: Module 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
