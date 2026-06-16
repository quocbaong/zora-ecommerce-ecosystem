import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import api from '@/lib/axios';

export default function QRJoinPage() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [status, setStatus] = useState<'preview' | 'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang lấy thông tin...');
  const [groupInfo, setGroupInfo] = useState<any>(null);

  useEffect(() => {
    if (!type || !id) {
      setStatus('error');
      setMessage('Đường dẫn không hợp lệ');
      return;
    }

    if (type === 'group') {
      if (!token) {
        setStatus('error');
        setMessage('Thiếu mã mời nhóm');
        return;
      }
      
      // Lấy thông tin preview nhóm
      api.get(`/api/chat/groups/${id}/preview?token=${token}`)
        .then(res => {
          setGroupInfo(res.data.data);
          setStatus('preview');
        })
        .catch(err => {
          setStatus('error');
          setMessage(err.response?.data?.error || 'Mã mời không hợp lệ hoặc đã hết hạn');
        });
    } else if (type === 'user') {
      // Đối với user, có thể gọi API add friend ngay hoặc báo chờ
      setStatus('preview'); // Tạm cho bấm nút luôn
    } else {
      setStatus('error');
      setMessage('Loại mã QR không được hỗ trợ');
    }
  }, [type, id, token]);

  const handleAccept = async () => {
    setStatus('loading');
    setMessage('Đang xử lý yêu cầu...');
    try {
      if (type === 'group') {
        await api.post('/api/chat/groups/join-via-link', { groupId: id, inviteToken: token });
        setStatus('success');
        setMessage('Tham gia nhóm thành công!');
        setTimeout(() => navigate('/chat'), 1500);
      } else if (type === 'user') {
        await api.post('/api/chat/friends/request', { toUserId: id });
        setStatus('success');
        setMessage('Đã gửi lời mời kết bạn!');
        setTimeout(() => navigate('/chat'), 1500);
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.error || err.message || 'Có lỗi xảy ra');
    }
  };

  const handleDecline = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold text-gray-800">{message}</h2>
            <p className="text-gray-500 mt-2">Vui lòng chờ trong giây lát...</p>
          </div>
        )}

        {status === 'preview' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            {type === 'group' && groupInfo ? (
              <>
                {groupInfo.avatarUrl ? (
                  <img src={groupInfo.avatarUrl} alt="Group Avatar" className="w-24 h-24 rounded-2xl mb-4 object-cover border-4 border-orange-50" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 border-4 border-white shadow-sm">
                    <span className="text-4xl font-black text-orange-500">{groupInfo.name?.charAt(0)}</span>
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-800 mb-1">{groupInfo.name}</h2>
                <div className="flex items-center text-gray-500 mb-8">
                  <Users size={16} className="mr-1.5" />
                  <span>{groupInfo.memberCount || 1} thành viên</span>
                </div>
                <p className="text-gray-600 mb-8">Bạn được mời tham gia nhóm chat này trên ZORA.</p>
              </>
            ) : (
               <>
                 <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                   <Users size={40} className="text-blue-500" />
                 </div>
                 <h2 className="text-2xl font-bold text-gray-800 mb-8">Kết bạn</h2>
                 <p className="text-gray-600 mb-8">Bạn có muốn gửi lời mời kết bạn đến người dùng này không?</p>
               </>
            )}

            <div className="flex gap-4 w-full">
              {groupInfo?.isMember ? (
                <button
                  onClick={() => navigate('/chat')}
                  className="w-full bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                  Vào nhóm
                </button>
              ) : (
                <>
                  <button
                    onClick={handleDecline}
                    className="flex-1 bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex-1 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
                  >
                    {type === 'group' ? 'Tham gia' : 'Kết bạn'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Thành công!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-400">Đang tự động chuyển hướng...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <XCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Không thành công</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
