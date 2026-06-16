const { PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

const TABLE = process.env.DYNAMODB_TABLE_CONVERSATIONS || 'chat_conversations';

/**
 * Lưu FAQ list của seller.
 * Dùng chung bảng chat_conversations với:
 *   PK = "SELLER#<sellerId>"
 *   SK = "FAQS"
 */
const saveFaqs = async (sellerId, faqs) => {
  const normalized = faqs.map((f, i) => ({
    id: f.id || uuidv4(),
    question: f.question,
    answer: f.answer,
    order: i,
  }));

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        PK: `SELLER#${sellerId}`,
        SK: 'FAQS',
        sellerId,
        faqs: normalized,
        updatedAt: new Date().toISOString(),
      },
    })
  );

  return normalized.map((f) => ({ ...f, sellerId }));
};

/**
 * Lấy FAQ list của seller.
 * Trả về [] nếu seller chưa cài đặt.
 */
const getFaqs = async (sellerId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { PK: `SELLER#${sellerId}`, SK: 'FAQS' },
    })
  );

  if (!result.Item || !Array.isArray(result.Item.faqs)) return [];
  return result.Item.faqs.map((f) => ({ ...f, sellerId }));
};

/**
 * Tìm một FAQ cụ thể theo sellerId + faqId.
 */
const getFaqById = async (sellerId, faqId) => {
  const list = await getFaqs(sellerId);
  return list.find((f) => f.id === faqId) || null;
};

module.exports = { saveFaqs, getFaqs, getFaqById };
