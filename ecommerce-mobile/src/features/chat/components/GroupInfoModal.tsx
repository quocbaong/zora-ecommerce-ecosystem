import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { X, Users, User, Shield, Info, LogOut, Bell, BellOff, Plus, MoreVertical, Edit2, Camera, Trash2, Image as ImageIcon, FileText, ChevronRight, QrCode } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants';
import apiClient from '../../../api/client';
import { useAuthStore } from '../../../contexts/authContext';
import { useChatStore } from '../../../store/chatStore';
import AddMemberModal from './AddMemberModal';
import MuteGroupModal from './MuteGroupModal';

interface GroupInfoModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onViewProfile?: (userId: string) => void;
  onGroupUpdated?: () => void;
  onLeftGroup?: () => void;
  onViewQRCode?: () => void;
}

export default function GroupInfoModal({ 
  visible, onClose, groupId, groupName, onViewProfile, onGroupUpdated, onLeftGroup, onViewQRCode 
}: GroupInfoModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { userStatuses } = useChatStore();
  
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMuteModal, setShowMuteModal] = useState(false);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(groupName);

  const loadGroupDetails = async () => {
    try {
      const [membersRes, groupRes, messagesRes] = await Promise.all([
        apiClient.get(`/chat/groups/${groupId}/members`),
        apiClient.get(`/chat/groups/${groupId}`),
        apiClient.get(`/chat/groups/${groupId}/messages?type=IMAGE,VIDEO,FILE`)
      ]);
      const membersData = membersRes.data?.members || membersRes.data?.data || (Array.isArray(membersRes.data) ? membersRes.data : []);
      const rawMembers = Array.isArray(membersData) ? membersData : [];
      const finalMembers = rawMembers.map((m: any) => ({
        ...m,
        role: m.role === 'DEPUTY' ? 'ADMIN' : m.role
      }));
      setMembers(finalMembers);
      
      const groupData = groupRes.data?.data || groupRes.data;
      setGroup(groupData || null);
      
      const mediaData = messagesRes.data?.messages || messagesRes.data?.data || (Array.isArray(messagesRes.data) ? messagesRes.data : []);
      setMedia(Array.isArray(mediaData) ? mediaData.slice(0, 8) : []);
      
      setEditedName(groupData?.name || groupName);

      // Check current user role to see if they are OWNER
      const myMember = finalMembers.find((m: any) => m.userId === user?.id);
      const isOwner = myMember?.role === 'OWNER';
      let fetchedPending: any[] = [];

      if (isOwner) {
        try {
          const pendingRes = await apiClient.get(`/chat/groups/${groupId}/pending-members`);
          const pendingData = pendingRes.data?.data || pendingRes.data || [];
          fetchedPending = Array.isArray(pendingData) ? pendingData : [];
          setPendingMembers(fetchedPending);
        } catch (e) {
          console.warn('Failed to load pending members', e);
        }
      }

      // Fetch missing profiles for names/avatars
      const pendingIds = fetchedPending.map((m: any) => m.userId);
      const missingIds = [...finalMembers.map(m => m.userId), ...pendingIds]
        .filter(id => id && !profilesMap[id]);

      if (missingIds.length > 0) {
        const newProfiles: Record<string, any> = { ...profilesMap };
        await Promise.all(missingIds.map(async (id) => {
          try {
            const res = await apiClient.get(`/users/${id}`);
            newProfiles[id] = res.data.data || res.data;
          } catch (e) {}
        }));
        setProfilesMap(newProfiles);
      }
    } catch (error) {
      console.warn('Failed to load group details', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMember = async (targetUserId: string) => {
    try {
      await apiClient.post(`/chat/groups/${groupId}/members/${targetUserId}/approve`);
      setPendingMembers(prev => prev.filter(m => m.userId !== targetUserId));
      
      // Reload members list to show newly approved member!
      const membersRes = await apiClient.get(`/chat/groups/${groupId}/members`);
      const membersData = membersRes.data?.members || membersRes.data?.data || (Array.isArray(membersRes.data) ? membersRes.data : []);
      const rawMembers = Array.isArray(membersData) ? membersData : [];
      const finalMembers = rawMembers.map((m: any) => ({
        ...m,
        role: m.role === 'DEPUTY' ? 'ADMIN' : m.role
      }));
      setMembers(finalMembers);
      
      Alert.alert('Thành công', 'Đã phê duyệt thành viên vào nhóm!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể phê duyệt thành viên');
    }
  };

  const handleRejectMember = async (targetUserId: string) => {
    try {
      await apiClient.post(`/chat/groups/${groupId}/members/${targetUserId}/reject`);
      setPendingMembers(prev => prev.filter(m => m.userId !== targetUserId));
      Alert.alert('Thành công', 'Đã từ chối yêu cầu tham gia của thành viên!');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể từ chối thành viên');
    }
  };

  useEffect(() => {
    if (visible) loadGroupDetails();
  }, [visible, groupId]);

  const isAdminOrOwner = (userId: string) => {
    const m = (members || []).find(m => m.userId === userId);
    return m?.role === 'OWNER' || m?.role === 'ADMIN';
  };

  const currentUserRole = (members || []).find(m => m.userId === user?.id)?.role || 'MEMBER';
  const currentUserMember = (members || []).find(m => m.userId === user?.id);
  const isCurrentlyMuted = !!(
    currentUserMember && 
    currentUserMember.mutedUntil && 
    (currentUserMember.mutedUntil === 'FOREVER' || new Date(currentUserMember.mutedUntil) > new Date())
  );

  const handleUpdateGroup = async () => {
    try {
      await apiClient.put(`/chat/groups/${groupId}`, { name: editedName });
      setIsEditing(false);
      loadGroupDetails();
      onGroupUpdated?.();
      Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm');
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin nhóm');
    }
  };

  const handleLeaveGroup = () => {
    const otherMembers = (members || []).filter(m => m.userId !== user?.id);

    let confirmMessage = 'Bạn có chắc chắn muốn rời khỏi nhóm này không?';
    if (currentUserRole === 'OWNER') {
      if (otherMembers.length === 0) {
        confirmMessage = 'Bạn có chắc chắn muốn rời khỏi nhóm này không? Vì bạn là thành viên duy nhất, nhóm sẽ bị giải tán.';
      } else {
        confirmMessage = 'Bạn đang là Trưởng nhóm. Khi bạn rời đi, quyền Trưởng nhóm sẽ được chuyển giao tự động cho Quản trị viên hoặc thành viên khác. Bạn vẫn muốn rời nhóm chứ?';
      }
    }

    Alert.alert(
      'Rời khỏi nhóm',
      confirmMessage,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Rời đi', 
          style: 'destructive',
          onPress: async () => {
            try {
              // CORRECT API CALL: Use POST /chat/groups/:groupId/leave
              await apiClient.post(`/chat/groups/${groupId}/leave`);
              onClose();
              onLeftGroup?.();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể rời khỏi nhóm');
            }
          }
        }
      ]
    );
  };

  const showMemberOptions = (member: any) => {
    if (member.userId === user?.id) return; // Don't show options for self here

    const options = ['Xem trang cá nhân'];
    const actions = [() => onViewProfile?.(member.userId)];

    if (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') {
      if (member.role !== 'OWNER') {
        options.push('Xóa khỏi nhóm');
        actions.push(() => { handleRemoveMember(member.userId); });
        
        if (currentUserRole === 'OWNER') {
          if (member.role === 'ADMIN') {
            options.push('Gỡ quyền Quản trị viên');
            actions.push(() => { handleUpdateRole(member.userId, 'MEMBER'); });
          } else {
            options.push('Phong làm Quản trị viên');
            actions.push(() => { handleUpdateRole(member.userId, 'ADMIN'); });
          }

          // Transfer Ownership option
          options.push('Chuyển quyền Trưởng nhóm');
          actions.push(() => {
            Alert.alert(
              'Chuyển quyền Trưởng nhóm',
              `Bạn có chắc chắn muốn chuyển quyền Trưởng nhóm cho ${profilesMap[member.userId]?.fullName || member.fullName || member.userId} không? Sau khi chuyển, bạn sẽ trở thành Phó nhóm (Quản trị viên).`,
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'Chuyển',
                  style: 'destructive',
                  onPress: async () => {
                    await handleUpdateRole(member.userId, 'OWNER');
                    Alert.alert('Thành công', 'Đã chuyển quyền Trưởng nhóm thành công!');
                  }
                }
              ]
            );
          });
        }
      }
    }

    options.push('Hủy');

    Alert.alert(
      profilesMap[member.userId]?.fullName || member.user?.fullName || 'Tùy chọn',
      '',
      options.map((opt, i) => ({
        text: opt,
        style: opt === 'Xóa khỏi nhóm' || opt === 'Chuyển quyền Trưởng nhóm' ? 'destructive' : i === options.length - 1 ? 'cancel' : 'default',
        onPress: i < actions.length ? actions[i] : undefined
      }))
    );
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await apiClient.delete(`/chat/groups/${groupId}/members/${userId}`);
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể xóa thành viên');
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      // Map frontend 'ADMIN' to backend 'DEPUTY'
      const apiRole = role === 'ADMIN' ? 'DEPUTY' : role;
      await apiClient.put(`/chat/groups/${groupId}/members/${userId}/role`, { role: apiRole });
      
      setMembers(prev => {
        // If we transferred owner role, downgrade self to ADMIN (DEPUTY) in state
        if (role === 'OWNER') {
          return prev.map(m => {
            if (m.userId === userId) return { ...m, role: 'OWNER' };
            if (m.userId === user?.id) return { ...m, role: 'ADMIN' };
            return m;
          });
        }
        return prev.map(m => m.userId === userId ? { ...m, role } : m);
      });
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật vai trò');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View 
          className="px-5 py-4 flex-row items-center justify-between border-b border-gray-50"
          style={{ paddingTop: Math.max(insets.top, 16) }}
        >
          <Text className="text-xl font-black text-secondary">Thông tin nhóm</Text>
          <TouchableOpacity onPress={onClose} className="bg-gray-100 p-2 rounded-full">
            <X size={20} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} className="mt-10" />
        ) : (
          <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
          >
            {/* Group Header */}
            <View className="items-center py-8">
              <View className="relative">
                <View className="w-28 h-28 rounded-[44px] bg-orange-100 items-center justify-center mb-4 border-4 border-orange-50 shadow-md">
                  {group?.avatarUrl ? (
                    <Image source={{ uri: group.avatarUrl }} className="w-full h-full rounded-[44px]" />
                  ) : (
                    <Users size={48} color={COLORS.primary} />
                  )}
                </View>
                {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                  <TouchableOpacity className="absolute bottom-4 right-0 bg-white p-2 rounded-full shadow-sm border border-gray-100">
                    <Camera size={16} color={COLORS.secondary} />
                  </TouchableOpacity>
                )}
              </View>

              {isEditing ? (
                <View className="flex-row items-center px-10">
                   <TextInput
                      className="flex-1 text-xl font-bold text-secondary text-center border-b-2 border-primary pb-px"
                      value={editedName}
                      onChangeText={setEditedName}
                      autoFocus
                   />
                   <TouchableOpacity onPress={handleUpdateGroup} className="ml-2 bg-primary p-2 rounded-xl">
                      <Check size={16} color="white" />
                   </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center justify-center px-10">
                  <Text className="text-xl font-bold text-secondary text-center" numberOfLines={2}>
                    {group?.name || groupName}
                  </Text>
                  {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                    <TouchableOpacity onPress={() => setIsEditing(true)} className="ml-2 p-1">
                      <Edit2 size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">
                NHÓM TRÒ CHUYỆN • {members.length} THÀNH VIÊN
              </Text>
            </View>

            {/* Quick Actions */}
            <View className="flex-row justify-around mb-8 px-8">
               <TouchableOpacity 
                 onPress={() => setShowAddMember(true)}
                 className="items-center bg-gray-50/80 w-[80px] py-1.5 rounded-2xl border border-gray-100"
                >
                  <View className="bg-blue-50 p-1 rounded-full mb-1">
                    <Plus size={16} color="#3b82f6" />
                  </View>
                  <Text className="text-[8px] font-black text-secondary tracking-widest uppercase">Mời bạn</Text>
               </TouchableOpacity>

               <TouchableOpacity 
                 onPress={onViewQRCode}
                 className="items-center bg-gray-50/80 w-[80px] py-1.5 rounded-2xl border border-gray-100"
                >
                  <View className="bg-orange-50 p-1 rounded-full mb-1">
                    <QrCode size={16} color={COLORS.primary} />
                  </View>
                  <Text className="text-[8px] font-black text-secondary tracking-widest uppercase">Mã QR</Text>
               </TouchableOpacity>
               
                <TouchableOpacity 
                  onPress={() => setShowMuteModal(true)}
                  className="items-center bg-gray-50/80 w-[80px] py-1.5 rounded-2xl border border-gray-100 active:bg-orange-50/10"
                >
                  <View className={`p-1 rounded-full mb-1 ${isCurrentlyMuted ? 'bg-red-50' : 'bg-orange-50'}`}>
                    {isCurrentlyMuted ? (
                      <BellOff size={16} color="#ef4444" />
                    ) : (
                      <Bell size={16} color={COLORS.primary} />
                    )}
                  </View>
                  <Text className={`text-[8px] font-black tracking-widest uppercase ${isCurrentlyMuted ? 'text-red-500' : 'text-secondary'}`}>
                    {isCurrentlyMuted ? 'Đang tắt' : 'Thông báo'}
                  </Text>
                </TouchableOpacity>
             </View>

            {/* Media Preview */}
            <View className="px-5 mb-10">
               <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Ảnh, Video & File</Text>
                  <TouchableOpacity className="flex-row items-center">
                     <Text className="text-[10px] font-bold text-primary uppercase mr-1">Tất cả</Text>
                     <ChevronRight size={12} color={COLORS.primary} />
                  </TouchableOpacity>
               </View>
               
               {media.length === 0 ? (
                 <View className="bg-gray-50 rounded-2xl p-6 items-center border border-gray-100">
                    <ImageIcon size={24} color="#d1d5db" />
                    <Text className="text-xs text-gray-400 mt-2 font-medium">Chưa có phương tiện nào</Text>
                 </View>
               ) : (
                 <View className="flex-row flex-wrap gap-2">
                    {media.map((item, index) => (
                       <TouchableOpacity 
                         key={item.messageId || index}
                         className="w-[23%] aspect-square bg-gray-100 rounded-xl overflow-hidden"
                       >
                          {item.type === 'IMAGE' ? (
                            <Image source={{ uri: item.content }} className="w-full h-full" />
                          ) : item.type === 'VIDEO' ? (
                            <View className="w-full h-full items-center justify-center bg-black">
                               <Image source={{ uri: item.content }} className="w-full h-full opacity-60" />
                               <View className="absolute">
                                  <Camera size={16} color="white" />
                               </View>
                            </View>
                          ) : (
                            <View className="w-full h-full items-center justify-center bg-purple-50">
                               <FileText size={20} color="#a855f7" />
                            </View>
                          )}
                       </TouchableOpacity>
                    ))}
                 </View>
               )}
            </View>

            {/* Pending approvals section for Trưởng nhóm (OWNER) on Mobile */}
            {currentUserRole === 'OWNER' && pendingMembers.length > 0 && (
              <View className="px-5 mb-10 mx-5 bg-orange-50/40 border border-orange-100/50 rounded-[32px] p-5">
                <Text className="text-[11px] font-black text-orange-600 uppercase tracking-widest mb-4">
                  Yêu cầu chờ duyệt ({pendingMembers.length})
                </Text>
                {pendingMembers.map((member) => {
                  const displayName = 
                    profilesMap[member.userId]?.fullName || profilesMap[member.userId]?.display_name ||
                    member.fullName || member.full_name || 
                    member.name || member.userId;
                  const avatarUrl = member.avatarUrl || member.user?.avatarUrl || member.userAvatar || profilesMap[member.userId]?.avatarUrl;
                  return (
                    <View key={member.userId} className="flex-row items-center justify-between mb-4">
                      <View className="flex-row items-center flex-1 min-w-0 mr-2">
                        <View className="w-10 h-10 rounded-[15px] bg-orange-100 items-center justify-center mr-3 border border-orange-200">
                          {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} className="w-full h-full rounded-[15px]" />
                          ) : (
                            <User size={18} color="#ea580c" />
                          )}
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-sm font-bold text-secondary truncate">{displayName}</Text>
                          <Text className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Mời vào nhóm</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <TouchableOpacity
                          onPress={() => handleApproveMember(member.userId)}
                          className="bg-green-500 px-3 py-1.5 rounded-xl flex-row items-center justify-center mr-1"
                        >
                          <Text className="text-white text-[10px] font-black uppercase tracking-wider">Duyệt</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRejectMember(member.userId)}
                          className="bg-red-100 px-3 py-1.5 rounded-xl flex-row items-center justify-center"
                        >
                          <Text className="text-red-500 text-[10px] font-black uppercase tracking-wider">Từ chối</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Member List */}
            <View className="px-5 mb-10">
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Thành viên ({members.length})</Text>
              </View>

              {members.map((member) => (
                <View 
                   key={member.userId} 
                   className="flex-row items-center mb-5"
                >
                  <TouchableOpacity 
                    onPress={() => onViewProfile?.(member.userId)}
                    className="flex-row items-center flex-1"
                  >
                  <View className="relative">
                    <View className="w-12 h-12 rounded-[18px] bg-orange-50 items-center justify-center mr-3 border border-orange-100">
                      { (member.avatarUrl || member.user?.avatarUrl || member.userAvatar || profilesMap[member.userId]?.avatarUrl) ? (
                        <Image source={{ uri: member.avatarUrl || member.user?.avatarUrl || member.userAvatar || profilesMap[member.userId]?.avatarUrl }} className="w-full h-full rounded-[18px]" />
                      ) : (
                        <User size={20} color={COLORS.primary} />
                      )}
                    </View>
                    {userStatuses[member.userId] === 'online' && (
                      <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-secondary">
                      { 
                        profilesMap[member.userId]?.fullName || profilesMap[member.userId]?.display_name ||
                        member.fullName || member.full_name || 
                        member.userName || member.username || 
                        member.displayName || member.display_name ||
                        member.user?.fullName || member.user?.full_name ||
                        member.user?.username || member.user?.display_name ||
                        member.name || member.userId
                      }
                      {member.userId === user?.id && <Text className="text-gray-400 font-medium"> (Bạn)</Text>}
                    </Text>
                    <View className="flex-row items-center mt-0.5">
                      {member.role === 'OWNER' || member.role === 'ADMIN' ? (
                        <Shield size={10} color={member.role === 'OWNER' ? "#f59e0b" : "#3b82f6"} className="mr-1" />
                      ) : null}
                      <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                        member.role === 'OWNER' ? 'text-orange-500' : member.role === 'ADMIN' ? 'text-blue-500' : 'text-gray-400'
                      }`}>
                        {member.role === 'OWNER' ? 'Chủ sở hữu' : member.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                      </Text>
                    </View>
                  </View>
                  </TouchableOpacity>
                  
                  {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN' || member.userId === user?.id) && (
                    <TouchableOpacity onPress={() => showMemberOptions(member)} className="p-2">
                       <MoreVertical size={16} color="#d1d5db" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            {/* Danger Zone */}
            <View 
              className="px-5 mb-6"
              style={{ paddingBottom: Math.max(insets.bottom, 24) }}
            >
               <TouchableOpacity 
                  onPress={handleLeaveGroup}
                  className="flex-row items-center py-4 px-6 bg-red-50 rounded-[28px] border border-red-100"
               >
                  <LogOut size={20} color="#ef4444" />
                  <Text className="text-sm font-bold text-red-500 ml-3">Rời khỏi nhóm</Text>
               </TouchableOpacity>
               
               {currentUserRole === 'OWNER' && (
                 <TouchableOpacity 
                    className="flex-row items-center py-4 px-6 bg-gray-50 rounded-[28px] mt-3 border border-gray-100"
                    onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
                 >
                    <Trash2 size={20} color="#9ca3af" />
                    <Text className="text-sm font-bold text-gray-400 ml-3">Giải tán nhóm</Text>
                 </TouchableOpacity>
               )}
            </View>
          </ScrollView>
        )}

        <AddMemberModal 
           visible={showAddMember}
           onClose={() => setShowAddMember(false)}
           groupId={groupId}
           existingMemberIds={(members || []).map(m => m.userId)}
           onMemberAdded={loadGroupDetails}
        />

        <MuteGroupModal
           visible={showMuteModal}
           onClose={() => setShowMuteModal(false)}
           groupId={groupId}
           groupName={group?.name || groupName}
           isMuted={isCurrentlyMuted}
           mutedUntil={currentUserMember?.mutedUntil}
           onMuteStatusChanged={loadGroupDetails}
        />
      </View>
    </Modal>
  );
}

const Check = ({ size, color }: { size: number, color: string }) => (
  <View style={{ width: size, height: size }} pointerEvents="none">
    <View style={{ flex: 1, backgroundColor: color, borderRadius: 100, alignItems: 'center', justifyContent: 'center' }}>
       <Users size={size * 0.6} color="white" />
    </View>
  </View>
);
