import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';

export interface StripePaymentFormRef {
  confirmPayment: (secret: string) => Promise<void>;
}

interface StripePaymentFormProps {
  onPaymentSuccess: () => void;
  onPaymentError: (error: string) => void;
}

const StripePaymentForm = forwardRef<StripePaymentFormRef, StripePaymentFormProps>(({
  onPaymentSuccess,
  onPaymentError,
}, ref) => {
  const stripe = useStripe();
  const elements = useElements();

  useImperativeHandle(ref, () => ({
    confirmPayment: async (secret: string) => {
      if (!stripe || !elements || !secret) {
        onPaymentError('Stripe chưa sẵn sàng hoặc thiếu client secret.');
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onPaymentError('Vui lòng nhập thông tin thẻ.');
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(secret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        onPaymentError(error.message || 'Thanh toán thất bại.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onPaymentSuccess();
      } else {
        onPaymentError('Thanh toán không thành công. Vui lòng thử lại.');
      }
    }
  }));

  return (
    <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Thông tin thẻ
      </label>
      <div className="bg-white p-3 rounded-lg border border-gray-300">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        Thanh toán được bảo mật bởi Stripe
      </p>
    </div>
  );
});

export default StripePaymentForm;
