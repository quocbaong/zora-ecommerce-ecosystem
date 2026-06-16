import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { X, Calendar as CalendarIcon, Clock, Users, Check, Bell, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGroupStore } from '../../../store/groupStore';
import { useAuthStore } from '../../../contexts/authContext';
import apiClient from '../../../api/client';
import dayjs from 'dayjs';

interface ReminderModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
}

export default function ReminderModal({ visible, onClose, groupId }: ReminderModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  
  // Custom JS Date-Time State
  const [day, setDay] = useState(new Date().getDate());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-indexed
  const [year, setYear] = useState(new Date().getFullYear());
  const [hour, setHour] = useState(new Date().getHours());
  const [minute, setMinute] = useState(Math.floor(new Date().getMinutes() / 5) * 5 + 5); // next 5 mins

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const groupMembersState = useGroupStore(state => state.groupMembers[groupId]);
  const groupMembers = (groupMembersState || []).filter(m => m.userId !== user?.id);

  const [profiles, setProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    if (visible && groupMembers.length > 0) {
      const fetchProfiles = async () => {
        const newProfiles = { ...profiles };
        const missingIds = groupMembers
          .map(m => m.userId)
          .filter(id => id && !newProfiles[id]);

        if (missingIds.length > 0) {
          await Promise.all(missingIds.map(async (id) => {
            try {
              const res = await apiClient.get(`/users/${id}`);
              const data = res.data?.data || res.data;
              if (data) {
                newProfiles[id] = data;
              }
            } catch (e) {
              console.warn(`Failed to fetch profile for user ${id}`, e);
            }
          }));
          setProfiles(newProfiles);
        }
      };
      fetchProfiles();
    }
  }, [visible, groupMembers]);

  // Align minutes if overflow
  useEffect(() => {
    if (minute >= 60) {
      setMinute(0);
      setHour(h => (h + 1) % 24);
    }
  }, [minute]);

  // Quick Date Selectors
  const setQuickDate = (daysFromNow: number) => {
    const target = dayjs().add(daysFromNow, 'day');
    setDay(target.date());
    setMonth(target.month() + 1);
    setYear(target.year());
  };

  // Helper to validate and get days in a month
  const getDaysInMonth = (m: number, y: number) => {
    return new Date(y, m, 0).getDate();
  };

  const adjustDay = (amount: number) => {
    const daysInMonth = getDaysInMonth(month, year);
    setDay(prev => {
      let next = prev + amount;
      if (next > daysInMonth) return 1;
      if (next < 1) return daysInMonth;
      return next;
    });
  };

  const adjustMonth = (amount: number) => {
    setMonth(prev => {
      let next = prev + amount;
      if (next > 12) return 1;
      if (next < 1) return 12;
      return next;
    });
  };

  const adjustHour = (amount: number) => {
    setHour(prev => {
      let next = prev + amount;
      if (next > 23) return 0;
      if (next < 0) return 23;
      return next;
    });
  };

  const adjustMinute = (amount: number) => {
    setMinute(prev => {
      let next = prev + amount;
      if (next >= 60) return 0;
      if (next < 0) return 55;
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const selectAll = () => {
    if (selectedUserIds.length === groupMembers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(groupMembers.map(m => m.userId));
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung nhắc hẹn.');
      return;
    }

    // Construct selected target date
    const targetDate = new Date(year, month - 1, day, hour, minute);

    if (targetDate.getTime() <= Date.now()) {
      Alert.alert('Thông báo', 'Thời gian hẹn phải ở tương lai.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(`/chat/groups/${groupId}/reminders`, {
        title: title.trim(),
        remindAt: targetDate.getTime(),
        participants: selectedUserIds
      });
      
      setTitle('');
      // reset to current time + 15m
      const resetDate = new Date(Date.now() + 15 * 60 * 1000);
      setDay(resetDate.getDate());
      setMonth(resetDate.getMonth() + 1);
      setYear(resetDate.getFullYear());
      setHour(resetDate.getHours());
      setMinute(Math.floor(resetDate.getMinutes() / 5) * 5 + 5);
      setSelectedUserIds([]);
      onClose();
    } catch (error: any) {
      console.error('Create reminder failed:', error?.response?.data || error);
      Alert.alert('Lỗi', error?.response?.data?.error || 'Không thể tạo nhắc hẹn. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper formatting for labels
  const formattedMonth = month < 10 ? `0${month}` : `${month}`;
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const formattedHour = hour < 10 ? `0${hour}` : `${hour}`;
  const formattedMinute = minute < 10 ? `0${minute}` : `${minute}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl h-[85%] flex-col overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-2.5">
                <Bell size={18} color="#f97316" />
              </View>
              <Text className="text-lg font-bold text-secondary">Tạo nhắc hẹn / lịch hẹn</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100">
              <X size={20} color="#4b5563" />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text className="text-sm font-bold text-secondary mb-2">Nội dung nhắc hẹn</Text>
            <View className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-5">
              <TextInput
                placeholder="Nhập nội dung cuộc hẹn, nhắc nhở..."
                value={title}
                onChangeText={setTitle}
                className="text-sm text-secondary font-medium"
                multiline
                numberOfLines={2}
                maxLength={100}
              />
            </View>

            {/* Premium JS DateTime Selection Spinner */}
            <Text className="text-sm font-bold text-secondary mb-2">Thời gian nhắc</Text>
            
            {/* Quick Date Options */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
              <TouchableOpacity onPress={() => setQuickDate(0)} className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 mr-2">
                <Text className="text-xs font-bold text-orange-500">Hôm nay</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickDate(1)} className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 mr-2">
                <Text className="text-xs font-bold text-orange-500">Ngày mai</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickDate(2)} className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 mr-2">
                <Text className="text-xs font-bold text-orange-500">2 ngày tới</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setQuickDate(3)} className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5">
                <Text className="text-xs font-bold text-orange-500">3 ngày tới</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Custom Spinner Panel */}
            <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5 flex-row justify-around items-center">
              {/* Day */}
              <View className="items-center">
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1">Ngày</Text>
                <TouchableOpacity onPress={() => adjustDay(1)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Plus size={16} color="#f97316" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-secondary my-1.5">{formattedDay}</Text>
                <TouchableOpacity onPress={() => adjustDay(-1)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Minus size={16} color="#f97316" />
                </TouchableOpacity>
              </View>

              <Text className="text-lg font-bold text-gray-300">/</Text>

              {/* Month */}
              <View className="items-center">
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1">Tháng</Text>
                <TouchableOpacity onPress={() => adjustMonth(1)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Plus size={16} color="#f97316" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-secondary my-1.5">{formattedMonth}</Text>
                <TouchableOpacity onPress={() => adjustMonth(-1)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Minus size={16} color="#f97316" />
                </TouchableOpacity>
              </View>

              <Text className="text-lg font-bold text-gray-300">|</Text>

              {/* Hour */}
              <View className="items-center">
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1">Giờ</Text>
                <TouchableOpacity onPress={() => adjustHour(1)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Plus size={16} color="#f97316" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-secondary my-1.5">{formattedHour}</Text>
                <TouchableOpacity onPress={() => adjustHour(-1)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Minus size={16} color="#f97316" />
                </TouchableOpacity>
              </View>

              <Text className="text-lg font-bold text-gray-300">:</Text>

              {/* Minute */}
              <View className="items-center">
                <Text className="text-[10px] font-bold text-gray-400 uppercase mb-1">Phút</Text>
                <TouchableOpacity onPress={() => adjustMinute(5)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Plus size={16} color="#f97316" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-secondary my-1.5">{formattedMinute}</Text>
                <TouchableOpacity onPress={() => adjustMinute(-5)} className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <Minus size={16} color="#f97316" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Selected Time Display Preview */}
            <View className="flex-row items-center justify-center mb-5 bg-orange-50/50 rounded-xl py-2 px-4 border border-orange-100/50">
              <Clock size={14} color="#f97316" className="mr-2" />
              <Text className="text-xs font-semibold text-orange-600">
                Sẽ nhắc vào lúc: {formattedHour}:{formattedMinute} ngày {formattedDay}/{formattedMonth}/{year}
              </Text>
            </View>

            {/* Participants */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Users size={18} color="#4b5563" className="mr-1.5" />
                <Text className="text-sm font-bold text-secondary">Thành viên tham gia</Text>
              </View>
              <TouchableOpacity onPress={selectAll} className="px-2.5 py-1 bg-orange-50 rounded-lg">
                <Text className="text-xs font-bold text-orange-500">
                  {selectedUserIds.length === groupMembers.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[11px] text-gray-400 mb-3 font-medium">
              * Để trống nếu muốn nhắc hẹn toàn bộ thành viên trong nhóm.
            </Text>

            <View className="bg-gray-50 border border-gray-200 rounded-2xl p-2.5 min-h-[180px] mb-8">
              {groupMembers.map((m) => {
                const isSelected = selectedUserIds.includes(m.userId);
                const userProfile = profiles[m.userId] || m.user;
                const displayName = m.nickname || userProfile?.fullName || userProfile?.display_name || userProfile?.email || 'Thành viên';
                const avatarUrl = userProfile?.avatarUrl;
                return (
                  <TouchableOpacity
                    key={m.userId}
                    onPress={() => toggleUser(m.userId)}
                    className="flex-row items-center p-2 rounded-xl mb-1.5 active:bg-white bg-transparent justify-between"
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center mr-2.5 overflow-hidden">
                        {avatarUrl ? (
                          <Image source={{ uri: avatarUrl }} className="w-full h-full" />
                        ) : (
                          <Text className="text-orange-500 text-xs font-bold">
                            {displayName.charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text className="text-sm font-semibold text-secondary flex-1" numberOfLines={1}>
                        {displayName}
                      </Text>
                    </View>

                    <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                      isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action button */}
          <View 
            className="p-5 border-t border-gray-100 bg-white"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className="bg-orange-500 rounded-2xl py-4 items-center justify-center shadow-lg shadow-orange-500/20 active:bg-orange-600"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-base font-bold">Tạo nhắc hẹn</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
