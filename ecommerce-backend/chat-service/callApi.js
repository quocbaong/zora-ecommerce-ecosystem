require('dotenv').config({ path: '../.env' });
const jwt = require('jsonwebtoken');

// Generate a dummy token for testing
const token = jwt.sign({
  id: "testUser123",
  role: "USER",
  email: "test@example.com"
}, process.env.JWT_SECRET || "fallback_secret", { expiresIn: '1h' });

const run = async () => {
  try {
    // 1. Create a conversation
    let res = await fetch(`http://localhost:9090/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user123',
        'x-role': 'USER'
      },
      body: JSON.stringify({
        sellerId: 'seller123',
        productId: 'prod123',
        productName: 'Test Product',
        productImage: 'img.jpg'
      })
    });
    
    let text = await res.text();
    console.log("Create Conversation:", text);
    const conv = JSON.parse(text).data;
    
    // 2. Report it
    console.log("Reporting conversation:", conv.conversationId);
    res = await fetch(`http://localhost:9090/chat/conversations/${conv.conversationId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user123'
      },
      body: JSON.stringify({
        reason: "SPAM",
        description: "Test description",
        evidenceMessageIds: []
      })
    });
    
    text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
};

run();
