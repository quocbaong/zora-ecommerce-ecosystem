import api from '@/lib/axios';

export interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
}

export interface PaymentResponse {
  clientSecret: string;
  paymentIntentId: string;
  status: string;
}

export const paymentService = {
  createPaymentIntent: (data: PaymentRequest) =>
    api.post<PaymentResponse>('/api/payments/create-intent', data).then((r) => r.data),
};
