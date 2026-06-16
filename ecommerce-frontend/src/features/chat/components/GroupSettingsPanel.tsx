import React, { useState, useRef } from 'react';
import { X, Camera, Loader2, LogOut, Trash2, MessageSquareOff, Crown, QrCode } from 'lucide-react';
import { QRCode, Modal as AntdModal } from 'antd';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { useUpdateGroupInfo, useUploadGroupAvatar, useDeleteGroup, useLeaveGroup } from '../hooks/useGroup';
import type { Group, GroupMember } from '../types/group';

interface Props {
  group: Group;
  myMember?: GroupMember | null;
  onClose: () => void;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-orange-500' : 'bg-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  );
}

export default function GroupSettingsPanel({ group, myMember, onClose }: Props) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || '');
  const [rules, setRules] = useState(group.rules || '');
  const [avatarUrl, setAvatarUrl] = useState(group.avatarUrl || '');
  const [allowMemberPost, setAllowMemberPost] = useState(group.allowMemberPost !== false);
  const [highlightAdminMessages, setHighlightAdminMessages] = useState(group.highlightAdminMessages === true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const updateInfo = useUpdateGroupInfo(group.groupId);
  const uploadAvatar = useUploadGroupAvatar(group.groupId);
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup();

  const isOwner = myMember?.role === 'OWNER';
  const canEdit = myMember?.role === 'OWNER' || myMember?.role === 'DEPUTY';

  const handleSave = () => {
    updateInfo.mutate({ name, description, rules, allowMemberPost, highlightAdminMessages });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadAvatar.mutate(file, {
      onSuccess: (newUrl) => setAvatarUrl(newUrl),
    });
  };

  const handleDeleteGroup = () => {
    AntdModal.confirm({
      title: 'Giải tán nhóm',
      content: `Giải tán nhóm "${group.name}"? Hành động này không thể hoàn tác.`,
      okText: 'Giải tán',
      okType: 'danger',
      cancelText: 'Hủy',
      centered: true,
      onOk: () => {
        deleteGroup.mutate(group.groupId, { onSuccess: onClose });
      }
    });
  };

  const handleLeaveGroup = () => {
    AntdModal.confirm({
      title: 'Rời nhóm',
      content: 'Bạn có chắc chắn muốn rời khỏi nhóm này không?',
      okText: 'Rời nhóm',
      okType: 'danger',
      cancelText: 'Hủy',
      centered: true,
      onOk: () => {
        leaveGroup.mutate(group.groupId, { onSuccess: onClose });
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-72 border-l border-gray-100 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-800 text-sm">Cài đặt nhóm</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            {canEdit && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadAvatar.isPending}
                className="absolute bottom-0 right-0 w-7 h-7 bg-orange-500 hover:bg-orange-600 rounded-full flex items-center justify-center text-white shadow transition"
              >
                {uploadAvatar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-gray-500">{group.memberCount} thành viên</p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Tên nhóm</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            maxLength={100}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
          />
        </div>

        {/* Rules */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Nội quy nhóm</label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            disabled={!canEdit}
            rows={3}
            placeholder="Nhập nội quy nhóm..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
          />
        </div>

        {/* Permissions section */}
        <div className="space-y-3 border border-gray-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-orange-400" /> Quyền nhắn tin
          </p>

          {/* Allow member post */}
          <div className="flex items-start gap-3">
            <Toggle
              checked={allowMemberPost}
              onChange={setAllowMemberPost}
              disabled={!canEdit}
            />
            <div>
              <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <MessageSquareOff className="w-3.5 h-3.5 text-gray-400" />
                Cho phép thành viên nhắn tin
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {allowMemberPost
                  ? 'Tất cả thành viên có thể gửi tin nhắn'
                  : 'Chỉ trưởng nhóm và phó nhóm mới gửi được'}
              </p>
            </div>
          </div>

          {/* Highlight admin messages */}
          <div className="flex items-start gap-3">
            <Toggle
              checked={highlightAdminMessages}
              onChange={setHighlightAdminMessages}
              disabled={!canEdit}
            />
            <div>
              <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-yellow-500" />
                Đánh dấu tin nhắn quản trị
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tin nhắn trưởng/phó nhóm sẽ có nhãn đặc biệt
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        {canEdit && (
          <button
            onClick={handleSave}
            disabled={updateInfo.isPending || !name.trim()}
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            {updateInfo.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Lưu thay đổi
          </button>
        )}

        {/* Danger zone */}
        <div className="pt-2 border-t space-y-2">
          <button
            onClick={async () => {
               setIsQrModalOpen(true);
               if (!inviteToken) {
                  setIsQrLoading(true);
                  try {
                     const res = await api.get(`/api/chat/groups/${group.groupId}/invite-link`);
                     setInviteToken(res.data?.data?.inviteToken || null);
                  } catch(e) {
                     toast.error('Lỗi lấy mã mời');
                  } finally {
                     setIsQrLoading(false);
                  }
               }
            }}
            className="w-full py-2 border border-orange-200 text-orange-500 hover:bg-orange-50 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            Mã QR Nhóm
          </button>

          <button
            onClick={handleLeaveGroup}
            disabled={leaveGroup.isPending}
            className="w-full py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {leaveGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Rời nhóm
          </button>

          {isOwner && (
            <button
              onClick={handleDeleteGroup}
              disabled={deleteGroup.isPending}
              className="w-full py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deleteGroup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Giải tán nhóm
            </button>
          )}
        </div>
      </div>
      
      {/* QR Code Modal */}
      <AntdModal
        title={null}
        open={isQrModalOpen}
        onCancel={() => setIsQrModalOpen(false)}
        footer={null}
        width={320}
        centered
        className="rounded-2xl"
      >
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-16 h-16 rounded-full border-2 border-orange-100 bg-orange-50 mb-3 flex items-center justify-center overflow-hidden">
             {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
             ) : (
                <span className="text-2xl font-bold text-orange-400">{name.charAt(0).toUpperCase()}</span>
             )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>
          <p className="text-sm text-gray-500 mb-6">Quét mã để tham gia nhóm trên ZORA</p>
          
          <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center min-h-[200px]">
             {isQrLoading ? (
                 <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
             ) : inviteToken ? (
                 <QRCode
                    value={`${import.meta.env.VITE_APP_URL || 'https://zora-ecommerce-ecosystem.vercel.app'}/qr/group/${group.groupId}?token=${inviteToken}`}
                    size={200}
                    color="#000000"
                    bordered={false}
                 />
             ) : (
                 <p className="text-sm text-gray-400">Không có mã QR</p>
             )}
          </div>
          
          <button 
             className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-white font-semibold hover:bg-orange-600 transition-colors"
             onClick={() => {
                if (inviteToken) {
                   navigator.clipboard.writeText(`${import.meta.env.VITE_APP_URL || 'https://zora-ecommerce-ecosystem.vercel.app'}/qr/group/${group.groupId}?token=${inviteToken}`);
                   toast.success('Đã sao chép liên kết nhóm');
                }
             }}
          >
             Sao chép liên kết
          </button>
          
          {canEdit && (
              <button 
                 className="mt-2 w-full rounded-xl border border-gray-200 py-2.5 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
                 onClick={async () => {
                    setIsQrLoading(true);
                    try {
                       const res = await api.post(`/api/chat/groups/${group.groupId}/reset-invite`);
                       setInviteToken(res.data?.data?.inviteToken || null);
                       toast.success('Đã làm mới mã QR');
                    } catch(e) {
                       toast.error('Lỗi làm mới mã mời');
                    } finally {
                       setIsQrLoading(false);
                    }
                 }}
              >
                 Làm mới mã
              </button>
          )}
        </div>
      </AntdModal>
    </div>
  );
}
