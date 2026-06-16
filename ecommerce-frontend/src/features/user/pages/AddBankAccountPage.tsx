import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Landmark, ArrowLeft } from 'lucide-react';
import { useAddBankAccount } from '../hooks/useUser';

const AddBankAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const addBank = useAddBankAccount();
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountHolderName: '', branchName: '', isDefault: false });

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    addBank.mutate(bankForm, {
      onSuccess: () => {
        navigate('/profile', { state: { tab: 'payment' } });
      }
    });
  };

  const inputCls = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20 py-10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-500 transition-colors mb-6 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Thêm Tài Khoản Ngân Hàng Mới</h2>
              <p className="text-sm text-gray-500">Nhận tiền từ doanh thu bán hàng hoặc hoàn tiền</p>
            </div>
          </div>

          <form onSubmit={handleAddBank} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên ngân hàng</label>
                <input required value={bankForm.bankName} onChange={e => setBankForm(p => ({ ...p, bankName: e.target.value }))} className={inputCls} placeholder="VD: Vietcombank" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Số tài khoản</label>
                <input required value={bankForm.accountNumber} onChange={e => setBankForm(p => ({ ...p, accountNumber: e.target.value }))} className={inputCls} placeholder="0123456789" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên chủ tài khoản</label>
                <input required value={bankForm.accountHolderName} onChange={e => setBankForm(p => ({ ...p, accountHolderName: e.target.value }))} className={inputCls} placeholder="NGUYEN VAN A" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Chi nhánh (Không bắt buộc)</label>
                <input value={bankForm.branchName} onChange={e => setBankForm(p => ({ ...p, branchName: e.target.value }))} className={inputCls} placeholder="Chi nhánh Hà Nội" />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2 mt-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <input type="checkbox" id="bankDefault" checked={bankForm.isDefault} onChange={e => setBankForm(p => ({ ...p, isDefault: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-400" />
                <label htmlFor="bankDefault" className="text-sm font-medium text-gray-700">Đặt làm tài khoản mặc định</label>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button type="submit" disabled={addBank.isPending} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors shadow-sm shadow-emerald-200">
                <Check className="w-4 h-4" /> Lưu tài khoản
              </button>
              <button type="button" onClick={() => navigate(-1)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-8 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                <X className="w-4 h-4" /> Huỷ bỏ
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddBankAccountPage;
