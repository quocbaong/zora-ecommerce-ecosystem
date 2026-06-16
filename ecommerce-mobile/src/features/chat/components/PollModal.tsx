import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, StyleSheet, Platform } from 'react-native';
import { X, Plus, Minus, Send, ClipboardList } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../constants';

interface PollModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (question: string, options: string[], isMultiple: boolean) => void;
}

export default function PollModal({ visible, onClose, onCreated }: PollModalProps) {
  const insets = useSafeAreaInsets();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [isMultiple, setIsMultiple] = useState(false);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const newOptions = [...options];
    newOptions[index] = text;
    setOptions(newOptions);
  };

  const handleCreate = () => {
    const filteredOptions = options.filter(opt => opt.trim() !== '');
    if (question.trim() === '' || filteredOptions.length < 2) {
      // Basic validation
      return;
    }
    onCreated(question, filteredOptions, isMultiple);
    reset();
    onClose();
  };

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setIsMultiple(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ClipboardList size={22} color={COLORS.primary} />
              <Text style={styles.headerTitle}>Tạo bình chọn mới</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Câu hỏi</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Nhập câu hỏi của bạn..."
              value={question}
              onChangeText={setQuestion}
              multiline
            />

            <Text style={styles.label}>Các lựa chọn</Text>
            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Lựa chọn ${index + 1}`}
                  value={option}
                  onChangeText={(text) => handleOptionChange(text, index)}
                />
                {options.length > 2 && (
                  <TouchableOpacity onPress={() => handleRemoveOption(index)} style={styles.removeBtn}>
                    <Minus size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < 10 && (
              <TouchableOpacity onPress={handleAddOption} style={styles.addOptionBtn}>
                <Plus size={18} color={COLORS.primary} />
                <Text style={styles.addOptionText}>Thêm lựa chọn</Text>
              </TouchableOpacity>
            )}

            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingTitle}>Bình chọn nhiều lựa chọn</Text>
                <Text style={styles.settingSub}>Cho phép thành viên chọn nhiều đáp án</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMultiple(!isMultiple)}
                style={[styles.toggle, isMultiple && styles.toggleActive]}
              >
                <View style={[styles.toggleCircle, isMultiple && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleCreate} 
              disabled={question.trim() === '' || options.filter(o => o.trim() !== '').length < 2}
              style={[styles.createBtn, (question.trim() === '' || options.filter(o => o.trim() !== '').length < 2) && styles.createBtnDisabled]}
            >
              <Send size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.createBtnText}>Tạo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginLeft: 12,
  },
  content: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: '#fff7ed',
    marginBottom: 32,
  },
  addOptionText: {
    marginLeft: 8,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 40,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  settingSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    padding: 24,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  createBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  createBtnDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 9999,
  },
  removeBtn: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
});
