import api from '@/lib/axios';
import type { ShopFaq, SaveShopFaqsPayload } from '../types';

function extractArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    for (const key of ['data', 'faqs', 'items', 'list']) {
      if (Array.isArray(r[key])) return r[key] as T[];
    }
  }
  return [];
}

export const faqService = {
  /** Get FAQ list for a seller (public — called by user side) */
  getFaqs: (sellerId: string): Promise<ShopFaq[]> =>
    api.get(`/api/chat/faqs/${sellerId}`).then((r) => extractArray<ShopFaq>(r.data)),

  /** Seller saves their FAQ list (upsert) */
  saveFaqs: (payload: SaveShopFaqsPayload): Promise<ShopFaq[]> =>
    api.put('/api/chat/faqs', payload).then((r) => extractArray<ShopFaq>(r.data)),

  /**
   * After user sends a FAQ question, call this to trigger the backend
   * to automatically send the seller's pre-configured answer.
   */
  triggerFaqReply: (conversationId: string, faqId: string): Promise<void> =>
    api
      .post(`/api/chat/conversations/${conversationId}/faq-reply`, { faqId })
      .then(() => {}),
};
