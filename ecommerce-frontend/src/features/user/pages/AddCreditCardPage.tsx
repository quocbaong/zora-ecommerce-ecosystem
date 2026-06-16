import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAddCreditCard, useSendCreditCardOtp, useAddresses } from '../hooks/useUser';
import { useEffect } from 'react';

const AddCreditCardPage: React.FC = () => {
  const navigate = useNavigate();
  const addCard = useAddCreditCard();
  const sendOtp = useSendCreditCardOtp();
  const { data: addresses } = useAddresses();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [cardForm, setCardForm] = useState({ 
    cardNumber: '', 
    expiryDate: '', 
    cvv: '',
    cardHolderName: '', 
    address: '',
    postalCode: '',
    otp: '' 
  });

  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.default) || addresses[0];
      const addressString = `${defaultAddr.street}, ${defaultAddr.ward}, ${defaultAddr.district}, ${defaultAddr.province}`;
      setCardForm(p => ({ ...p, address: addressString }));
    }
  }, [addresses]);

  const getCardBrand = (number: string) => {
    if (number.startsWith('4')) return 'Visa';
    if (number.match(/^5[1-5]/)) return 'Mastercard';
    if (number.startsWith('3')) return 'Amex';
    return 'JCB';
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp.mutate(undefined, {
      onSuccess: () => {
        setStep(2);
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      cardBrand: getCardBrand(cardForm.cardNumber),
      last4Digits: cardForm.cardNumber.slice(-4) || '0000',
      expiryDate: cardForm.expiryDate,
      cardHolderName: cardForm.cardHolderName,
      isDefault: false,
      otp: cardForm.otp
    };
    addCard.mutate(payload, {
      onSuccess: () => {
        navigate('/profile', { state: { tab: 'payment' } });
      }
    });
  };

  const inputCls = 'w-full rounded border border-gray-300 bg-white px-4 py-3 text-sm focus:outline-none focus:border-gray-400 focus:ring-0';

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-sm shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => step === 2 ? setStep(1) : navigate('/profile', { state: { tab: 'payment' } })}
              className="text-gray-400 hover:text-orange-500 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-medium text-gray-800">
              {step === 1 ? 'Thêm thẻ tín dụng' : 'Xác Minh OTP'}
            </h2>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-8">
              {/* Security Banner */}
              <div className="bg-green-50/50 border border-emerald-500 rounded p-4 flex gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800 mb-1">Thông tin thẻ của bạn được bảo vệ.</p>
                  <p className="text-xs text-emerald-700/80 leading-relaxed">
                    Chúng tôi hợp tác với ZoraPay để đảm bảo thông tin thẻ của bạn được bảo mật và an toàn. Zora sẽ không có quyền truy cập vào thông tin thẻ của bạn.
                  </p>
                </div>
              </div>

              {/* Card Details */}
              <div>
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-base font-bold text-gray-800">Chi tiết thẻ</h3>
                  <div className="flex gap-3 items-center">
                    <img src="https://cdn.simpleicons.org/visa/1434CB" alt="Visa" className="h-3.5 object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/40/JCB_logo.svg" alt="JCB" className="h-5 object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/1/1b/UnionPay_logo.svg" alt="UnionPay" className="h-5 object-contain" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" className="h-5 object-contain" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <input 
                      required 
                      value={cardForm.cardNumber} 
                      onChange={e => setCardForm(p => ({ ...p, cardNumber: e.target.value }))} 
                      className={inputCls} 
                      placeholder="Số thẻ" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input 
                        required 
                        value={cardForm.expiryDate} 
                        onChange={e => setCardForm(p => ({ ...p, expiryDate: e.target.value }))} 
                        className={inputCls} 
                        placeholder="Ngày hết hạn (MM/YY)" 
                      />
                    </div>
                    <div className="relative">
                      <input 
                        required 
                        value={cardForm.cvv} 
                        onChange={e => setCardForm(p => ({ ...p, cvv: e.target.value }))} 
                        className={inputCls} 
                        placeholder="Mã CVV" 
                        maxLength={4}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-gray-300 text-gray-400 flex items-center justify-center text-xs font-bold cursor-help" title="Mã bảo mật 3 hoặc 4 số phía sau thẻ">?</div>
                    </div>
                  </div>
                  <div>
                    <input 
                      required 
                      value={cardForm.cardHolderName} 
                      onChange={e => setCardForm(p => ({ ...p, cardHolderName: e.target.value.toUpperCase() }))} 
                      className={`${inputCls} uppercase`} 
                      placeholder="Họ và tên chủ thẻ" 
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="pt-2">
                <h3 className="text-base font-bold text-gray-800 mb-4">Địa chỉ đăng ký thẻ Tín dụng/Ghi nợ</h3>
                <div className="space-y-4 relative">
                  <div className="relative">
                    <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] text-gray-400">Địa chỉ</label>
                    <input 
                      required 
                      value={cardForm.address} 
                      onChange={e => setCardForm(p => ({ ...p, address: e.target.value }))} 
                      className={inputCls} 
                    />
                  </div>
                  <div>
                    <input 
                      value={cardForm.postalCode} 
                      onChange={e => setCardForm(p => ({ ...p, postalCode: e.target.value }))} 
                      className={inputCls} 
                      placeholder="Mã bưu chính" 
                    />
                  </div>
                </div>
              </div>

              {/* Note */}
              <p className="text-sm text-gray-500 pt-4">
                1.000 VND có thể bị trừ trong thẻ của bạn trong quá trình xác minh thẻ. Số tiền này sẽ được hoàn trả trong vòng 14 ngày.
              </p>

              {/* Buttons */}
              <div className="flex justify-end gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => navigate('/profile', { state: { tab: 'payment' } })} 
                  className="px-12 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Huỷ
                </button>
                <button 
                  type="submit" 
                  disabled={sendOtp.isPending} 
                  className="px-12 py-2.5 text-sm font-medium text-white bg-[#ee4d2d] hover:bg-[#d73211] disabled:opacity-70 transition-colors"
                >
                  Hoàn thành
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="py-8">
              <div className="flex flex-col items-center justify-center space-y-6">
                <p className="text-sm text-gray-600 text-center max-w-sm">
                  Vui lòng nhập mã xác thực OTP gồm 6 chữ số đã được gửi đến địa chỉ Email đăng ký của bạn.
                </p>
                <div className="w-full max-w-xs mx-auto">
                  <input 
                    type="text" 
                    required
                    placeholder="Nhập mã OTP..."
                    maxLength={6}
                    value={cardForm.otp}
                    onChange={e => setCardForm(p => ({ ...p, otp: e.target.value }))}
                    className="w-full text-center tracking-widest text-xl font-medium rounded border border-gray-300 bg-white px-4 py-3 focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
                  />
                </div>
              </div>
              
              <div className="flex justify-center gap-4 mt-12 pt-4">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="px-12 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Trở lại
                </button>
                <button 
                  type="submit" 
                  disabled={addCard.isPending || cardForm.otp.length < 6}
                  className="px-12 py-2.5 text-sm font-medium text-white bg-[#ee4d2d] hover:bg-[#d73211] disabled:opacity-70 transition-colors"
                >
                  Xác Nhận
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddCreditCardPage;
