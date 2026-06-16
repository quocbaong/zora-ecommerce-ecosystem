import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, Landmark, Trash2, CheckCircle2, ArrowLeft, Search, User, MapPin, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { useBankAccounts, useAddBankAccount, useDeleteBankAccount, useCreditCards, useDeleteCreditCard, useSendBankOtp } from '../hooks/useUser';
import { formatUpperCaseNoAccents } from '../../../utils/format';

const BANKS = [
  { id: 'vcb', name: 'Vietcombank', logo: 'https://api.vietqr.io/img/VCB.png' },
  { id: 'tcb', name: 'Techcombank', logo: 'https://api.vietqr.io/img/TCB.png' },
  { id: 'mb', name: 'MBBank', logo: 'https://api.vietqr.io/img/MB.png' },
  { id: 'icb', name: 'VietinBank', logo: 'https://api.vietqr.io/img/ICB.png' },
  { id: 'bidv', name: 'BIDV', logo: 'https://api.vietqr.io/img/BIDV.png' },
  { id: 'vba', name: 'Agribank', logo: 'https://api.vietqr.io/img/VBA.png' },
  { id: 'acb', name: 'ACB', logo: 'https://api.vietqr.io/img/ACB.png' },
  { id: 'stb', name: 'Sacombank', logo: 'https://api.vietqr.io/img/STB.png' },
  { id: 'tpb', name: 'TPBank', logo: 'https://api.vietqr.io/img/TPB.png' },
  { id: 'vpb', name: 'VPBank', logo: 'https://api.vietqr.io/img/VPB.png' },
];

const PaymentMethodsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: bankAccounts, isLoading: banksLoading } = useBankAccounts();
  const { data: creditCards, isLoading: cardsLoading } = useCreditCards();
  const addBank = useAddBankAccount();
  const sendBankOtp = useSendBankOtp();
  const deleteBank = useDeleteBankAccount();
  const deleteCard = useDeleteCreditCard();

  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankModalStep, setBankModalStep] = useState<1 | 2 | 3>(1);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    branchName: '',
    accountNumber: '',
    accountHolderName: '',
    idCard: '', // for UI only
    isDefault: false,
    otp: '',
  });

  const [bankSearch, setBankSearch] = useState('');
  const [isBankListOpen, setIsBankListOpen] = useState(false);

  const filteredBanks = BANKS.filter(b => 
    b.name.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleBankFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBankModalStep(2);
  };

  const handleConfirmAddBank = () => {
    sendBankOtp.mutate(undefined, {
      onSuccess: () => {
        setBankModalStep(3);
      }
    });
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    addBank.mutate(bankForm, {
      onSuccess: () => {
        setIsBankModalOpen(false);
        setBankModalStep(1);
        setBankForm({ bankName: '', branchName: '', accountNumber: '', accountHolderName: '', idCard: '', isDefault: false, otp: '' });
      }
    });
  };

  const closeBankModal = () => {
    setIsBankModalOpen(false);
    setTimeout(() => {
      setBankModalStep(1);
      setBankForm(p => ({ ...p, otp: '' }));
    }, 300);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Ngân hàng & Thẻ thanh toán</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý thẻ tín dụng/ghi nợ và tài khoản ngân hàng của bạn</p>
        </div>
      </div>

      {/* ── Credit/Debit Card Section ── */}
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-orange-500" />
            Thẻ Tín Dụng / Ghi Nợ
          </h3>
          <button 
            onClick={() => navigate('/payment/add-card')} 
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors shadow-sm shadow-orange-200"
          >
            <Plus className="w-4 h-4" /> Thêm thẻ mới
          </button>
        </div>

        {cardsLoading ? (
           <div className="h-24 bg-gray-50 rounded-2xl animate-pulse"></div>
        ) : !creditCards || creditCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 transition-all hover:bg-gray-50">
            <div className="w-16 h-16 mb-4 rounded-full bg-white shadow-sm flex items-center justify-center ring-1 ring-gray-100">
              <CreditCard className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold text-sm">Bạn chưa liên kết thẻ nào</p>
            <p className="text-gray-400 text-xs mt-1">Liên kết thẻ để thanh toán nhanh chóng và an toàn hơn</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {creditCards.map(card => (
              <div key={card.id} className="relative overflow-hidden rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5 shadow-sm group transition-all hover:shadow-md hover:border-orange-200">
                <div className="absolute top-0 right-0 p-3">
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteCard.mutate(card.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa thẻ">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-orange-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 text-lg">{card.cardBrand}</h4>
                      {card.isDefault && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-600 tracking-wide mb-0.5">**** **** **** {card.last4Digits}</p>
                    <p className="text-xs text-gray-500 uppercase font-medium">{card.cardHolderName} • {card.expiryDate}</p>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bank Account Section ── */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-500" />
            Tài Khoản Ngân Hàng
          </h3>
          <button 
            onClick={() => setIsBankModalOpen(true)} 
            className="flex items-center gap-1.5 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm tài khoản
          </button>
        </div>

        {banksLoading ? (
           <div className="h-24 bg-gray-50 rounded-2xl animate-pulse"></div>
        ) : !bankAccounts || bankAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 transition-all hover:bg-gray-50">
            <div className="w-16 h-16 mb-4 rounded-full bg-white shadow-sm flex items-center justify-center ring-1 ring-gray-100">
              <Landmark className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-600 font-semibold text-sm">Bạn chưa liên kết tài khoản ngân hàng</p>
            <p className="text-gray-400 text-xs mt-1">Sử dụng tài khoản ngân hàng để nhận tiền hoặc hoàn tiền</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map(bank => (
              <div key={bank.id} className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm group transition-all hover:shadow-md hover:border-emerald-200">
                <div className="absolute top-0 right-0 p-3">
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => deleteBank.mutate(bank.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa tài khoản">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-emerald-100 flex items-center justify-center shrink-0">
                    <Landmark className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 text-lg">{bank.bankName}</h4>
                      {bank.isDefault && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-600 tracking-wide mb-0.5">
                      **** **** **** {bank.accountNumber.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500 uppercase font-medium">{bank.accountHolderName} {bank.branchName ? `• ${bank.branchName}` : ''}</p>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bank Account Modal ── */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center px-6 py-4 border-b border-gray-100">
              <button 
                onClick={bankModalStep === 3 ? () => setBankModalStep(2) : bankModalStep === 2 ? () => setBankModalStep(1) : closeBankModal}
                className="text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-medium text-gray-800">
                {bankModalStep === 1 ? 'Thêm Tài Khoản Ngân Hàng' : bankModalStep === 2 ? 'Xác Nhận Thông Tin' : 'Xác Minh OTP'}
              </h2>
            </div>

            {/* Modal Body */}
            {bankModalStep === 1 ? (
              <form onSubmit={handleBankFormSubmit} className="p-8 space-y-8">
                {/* 🏦 Bank Information Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold">
                    <Landmark className="w-5 h-5 text-emerald-500" />
                    <span>Thông tin ngân hàng</span>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Bank Selection */}
                    <div className="relative">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">Chọn ngân hàng</label>
                      <button
                        type="button"
                        onClick={() => setIsBankListOpen(!isBankListOpen)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-white hover:border-emerald-400 transition-all text-sm group"
                      >
                        <div className="flex items-center gap-3">
                          {bankForm.bankName ? (
                            <>
                              <img 
                                src={BANKS.find(b => b.name === bankForm.bankName)?.logo} 
                                alt="" 
                                className="w-6 h-6 object-contain"
                              />
                              <span className="font-medium text-gray-800">{bankForm.bankName}</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-5 h-5 text-gray-400 group-hover:text-emerald-500" />
                              <span className="text-gray-400">Chọn ngân hàng của bạn...</span>
                            </>
                          )}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isBankListOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isBankListOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 border-b border-gray-50">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Tìm kiếm ngân hàng..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20"
                                value={bankSearch}
                                onChange={e => setBankSearch(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {filteredBanks.length > 0 ? filteredBanks.map(bank => (
                              <button
                                key={bank.id}
                                type="button"
                                onClick={() => {
                                  setBankForm(p => ({ ...p, bankName: bank.name }));
                                  setIsBankListOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-emerald-50 rounded-lg transition-colors group"
                              >
                                <div className="flex items-center gap-3">
                                  <img src={bank.logo} alt="" className="w-8 h-8 object-contain bg-white rounded p-1 border border-gray-100" />
                                  <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700">{bank.name}</span>
                                </div>
                                {bankForm.bankName === bank.name && <Check className="w-4 h-4 text-emerald-500" />}
                              </button>
                            )) : (
                              <div className="py-8 text-center text-gray-400 text-sm">Không tìm thấy ngân hàng</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Branch */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nhập tên chi nhánh</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input 
                            type="text"
                            value={bankForm.branchName} 
                            onChange={e => setBankForm(p => ({ ...p, branchName: e.target.value }))}
                            placeholder="VD: Chi nhánh Hà Nội"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      {/* Account Number */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">Nhập số tài khoản</label>
                        <div className="relative group">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                          <input 
                            required
                            type="text"
                            value={bankForm.accountNumber} 
                            onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value.replace(/\D/g, '') }))}
                            placeholder="0123 4567 89..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 👤 Account Holder Section */}
                <div>
                  <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold">
                    <User className="w-5 h-5 text-blue-500" />
                    <span>Thông tin chủ tài khoản</span>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">Họ và tên</label>
                        <div className="relative group">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            required
                            type="text"
                            value={bankForm.accountHolderName} 
                            onChange={e => setBankForm(p => ({ ...p, accountHolderName: formatUpperCaseNoAccents(e.target.value) }))}
                            placeholder="NGUYEN VAN A"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all uppercase font-semibold"
                          />
                        </div>
                      </div>

                      {/* ID Card */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 ml-1">Số CMND / CCCD</label>
                        <div className="relative group">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            type="text"
                            value={bankForm.idCard} 
                            onChange={e => setBankForm(p => ({ ...p, idCard: e.target.value.replace(/\D/g, '') }))}
                            placeholder="Nhập số căn cước..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Default Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Đặt làm tài khoản mặc định</p>
                      <p className="text-xs text-gray-500">Ưu tiên sử dụng cho các giao dịch hoàn tiền</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBankForm(p => ({ ...p, isDefault: !p.isDefault }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      bankForm.isDefault ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        bankForm.isDefault ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={closeBankModal}
                    className="flex-1 px-6 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                  >
                    TRỞ LẠI
                  </button>
                  <button 
                    type="submit" 
                    disabled={!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName}
                    className="flex-1 px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-orange-200"
                  >
                    TIẾP THEO
                  </button>
                </div>
              </form>
            ) : bankModalStep === 2 ? (
              <div className="p-8 space-y-8">
                <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Xác nhận thông tin</h3>
                      <p className="text-xs text-gray-500">Vui lòng kiểm tra kỹ thông tin trước khi tiếp tục</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-emerald-100/50">
                      <span className="text-sm text-gray-500 font-medium">Ngân hàng</span>
                      <div className="flex items-center gap-2">
                        <img src={BANKS.find(b => b.name === bankForm.bankName)?.logo} alt="" className="w-6 h-6 object-contain" />
                        <span className="text-sm font-bold text-gray-800">{bankForm.bankName}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-emerald-100/50">
                      <span className="text-sm text-gray-500 font-medium">Chi nhánh</span>
                      <span className="text-sm font-bold text-gray-800">{bankForm.branchName || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-emerald-100/50">
                      <span className="text-sm text-gray-500 font-medium">Số tài khoản</span>
                      <span className="text-sm font-bold text-gray-800 tracking-wider">{bankForm.accountNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-emerald-100/50">
                      <span className="text-sm text-gray-500 font-medium">Chủ tài khoản</span>
                      <span className="text-sm font-bold text-gray-800 uppercase">{bankForm.accountHolderName}</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-gray-500 font-medium">Số CMND/CCCD</span>
                      <span className="text-sm font-bold text-gray-800">{bankForm.idCard || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setBankModalStep(1)}
                    className="flex-1 px-6 py-3 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
                  >
                    CHỈNH SỬA
                  </button>
                  <button 
                    type="button" 
                    onClick={handleConfirmAddBank}
                    disabled={sendBankOtp.isPending}
                    className="flex-[2] px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    {sendBankOtp.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : null}
                    XÁC NHẬN & NHẬN OTP
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="p-8 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <RefreshCw className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Xác minh OTP</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    Mã xác thực 6 chữ số đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã bên dưới.
                  </p>
                </div>

                <div className="flex justify-center">
                  <input 
                    type="text" 
                    required
                    placeholder="••••••"
                    maxLength={6}
                    value={bankForm.otp}
                    onChange={e => setBankForm(p => ({ ...p, otp: e.target.value.replace(/\D/g, '') }))}
                    className="w-full max-w-[240px] text-center tracking-[1em] text-2xl font-bold rounded-2xl border-2 border-gray-100 bg-gray-50 px-4 py-4 focus:outline-none focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-400/10 transition-all placeholder:tracking-normal placeholder:text-gray-300"
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setBankModalStep(2)}
                    className="flex-1 px-6 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                  >
                    TRỞ LẠI
                  </button>
                  <button 
                    type="submit" 
                    disabled={addBank.isPending || bankForm.otp.length < 6}
                    className="flex-[2] px-8 py-3 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-orange-200 flex items-center justify-center gap-2"
                  >
                    {addBank.isPending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : null}
                    HOÀN TẤT
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodsPage;
