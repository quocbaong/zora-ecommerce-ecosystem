import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, Image, TouchableOpacity, Modal, SafeAreaView, 
  TextInput, KeyboardAvoidingView, Platform, Dimensions,
  PanResponder, Animated, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { 
  X, Check, RotateCw, RefreshCw, Pencil, Smile, 
  Crop as CropIcon, Undo2, Minus, Plus 
} from 'lucide-react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import Svg, { Polyline } from 'react-native-svg';
import ViewShot from 'react-native-view-shot';
import { COLORS } from '../../../constants';

// ── Types ─────────────────────────────────────────────────────────────────────
type EditorTab = 'crop' | 'draw' | 'sticker';

interface DrawLine {
  points: string; // SVG points string
  color: string;
  width: number;
}

interface StickerItem {
  id: string;
  emoji: string;
  x: Animated.Value;
  y: Animated.Value;
  size: number;
}

interface Props {
  visible: boolean;
  imageUri: string;
  onCancel: () => void;
  onDone: (newUri: string, caption?: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BRUSH_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
const BRUSH_SIZES = [4, 8, 16];
const STICKER_EMOJIS = [
  '😀','😂','🥰','😍','🤩','😎','🥳','🤔','😅','😭',
  '😱','🤯','😴','🤗','😏','🙄','😤','🥺','😇','🤣',
  '👍','👎','👏','🙌','❤️','🔥','✨','💯','🎉','🙏',
  '💪','👀','🌟','⭐','🌈','🦄','💀','🤡','👻','💩',
];

const ASPECT_OPTIONS = [
  { label: 'Tự do', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ImageEditorModal({ visible, imageUri, onCancel, onDone }: Props) {
  const [tab, setTab] = useState<EditorTab>('crop');
  const [currentUri, setCurrentUri] = useState(imageUri);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // ── Drawing State ──
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [currentLine, setCurrentLine] = useState<string | null>(null);
  const [brushColor, setBrushColor] = useState('#ef4444');
  const [brushSizeIdx, setBrushSizeIdx] = useState(1);

  // ── Sticker State ──
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const viewShotRef = useRef<ViewShot>(null);

  useEffect(() => {
    if (visible) {
      setCurrentUri(imageUri);
      setCaption('');
      setLines([]);
      setStickers([]);
      setTab('crop');
    }
  }, [visible, imageUri]);

  // ── Crop/Rotate Logic ──
  const handleRotate = async () => {
    setLoading(true);
    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
    } catch (error) {
      console.error('Rotate error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentUri(imageUri);
    setLines([]);
    setStickers([]);
  };

  // ── Drawing Logic ──
  const handleTouchStart = (event: any) => {
    if (tab !== 'draw') return;
    const { locationX, locationY } = event.nativeEvent;
    setCurrentLine(`${locationX},${locationY}`);
  };

  const handleTouchMove = (event: any) => {
    if (tab !== 'draw' || !currentLine) return;
    const { locationX, locationY } = event.nativeEvent;
    setCurrentLine(prev => `${prev} ${locationX},${locationY}`);
  };

  const handleTouchEnd = () => {
    if (tab !== 'draw' || !currentLine) return;
    setLines(prev => [...prev, { 
      points: currentLine, 
      color: brushColor, 
      width: BRUSH_SIZES[brushSizeIdx] 
    }]);
    setCurrentLine(null);
  };

  const handleUndo = () => {
    if (tab === 'draw' && lines.length > 0) {
      setLines(prev => prev.slice(0, -1));
    } else if (tab === 'sticker' && stickers.length > 0) {
      setStickers(prev => prev.slice(0, -1));
    }
  };

  // ── Sticker Logic ──
  const addSticker = (emoji: string) => {
    const id = Date.now().toString();
    const x = new Animated.Value(SCREEN_WIDTH / 2 - 20);
    const y = new Animated.Value(SCREEN_HEIGHT / 3);
    
    const newSticker: StickerItem = {
      id,
      emoji,
      x,
      y,
      size: 50,
    };
    
    setStickers(prev => [...prev, newSticker]);
    setSelectedStickerId(id);
  };

  const createPanResponder = (sticker: StickerItem) => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      setSelectedStickerId(sticker.id);
      sticker.x.setOffset((sticker.x as any)._value);
      sticker.y.setOffset((sticker.y as any)._value);
      sticker.x.setValue(0);
      sticker.y.setValue(0);
    },
    onPanResponderMove: Animated.event([
      null,
      { dx: sticker.x, dy: sticker.y }
    ], { useNativeDriver: false }),
    onPanResponderRelease: () => {
      sticker.x.flattenOffset();
      sticker.y.flattenOffset();
    }
  });

  const resizeSticker = (id: string, delta: number) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, size: Math.max(20, Math.min(150, s.size + delta)) } : s));
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    if (selectedStickerId === id) setSelectedStickerId(null);
  };

  // ── Final Save ──
  const handleExport = async () => {
    setProcessing(true);
    try {
      if (viewShotRef.current) {
        const uri = await (viewShotRef.current as any).capture();
        onDone(uri, caption);
      }
    } catch (e) {
      console.error('Export error:', e);
      Alert.alert('Lỗi', 'Không thể lưu ảnh chỉnh sửa. Có thể do giới hạn bộ nhớ hoặc thiết bị không hỗ trợ.');
    } finally {
      setProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-black">
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            {/* Header */}
            <SafeAreaView className="bg-black/50 z-50">
              <View className="flex-row items-center justify-between px-4 py-3">
                <TouchableOpacity onPress={onCancel} className="p-2">
                  <X size={24} color="#fff" />
                </TouchableOpacity>
                
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={handleUndo} className="p-2 bg-white/10 rounded-full">
                    <Undo2 size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleReset} className="p-2 bg-white/10 rounded-full">
                    <RefreshCw size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  onPress={handleExport}
                  disabled={processing}
                  className="bg-primary px-6 py-2 rounded-full shadow-lg shadow-orange-500/30"
                >
                  <Text className="text-white font-bold">{processing ? '...' : 'Xong'}</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* Main Editor Surface */}
            <View className="flex-1 relative bg-neutral-900 overflow-hidden items-center justify-center">
              <ViewShot 
                ref={viewShotRef} 
                options={{ format: 'jpg', quality: 0.9 }}
                style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH * 1.2, backgroundColor: '#262626' }}
              >
                <Image 
                  source={{ uri: currentUri }} 
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />

                {/* Drawing Layer */}
                <View 
                  className="absolute inset-0"
                  onStartShouldSetResponder={() => tab === 'draw'}
                  onResponderGrant={handleTouchStart}
                  onResponderMove={handleTouchMove}
                  onResponderRelease={handleTouchEnd}
                >
                  <Svg height="100%" width="100%">
                    {lines.map((line, i) => (
                      <Polyline
                        key={i}
                        points={line.points}
                        fill="none"
                        stroke={line.color}
                        strokeWidth={line.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {currentLine && (
                      <Polyline
                        points={currentLine}
                        fill="none"
                        stroke={brushColor}
                        strokeWidth={BRUSH_SIZES[brushSizeIdx]}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </Svg>
                </View>

                {/* Stickers Layer */}
                <View className="absolute inset-0 pointer-events-none">
                  {stickers.map((s) => (
                    <Animated.View
                      key={s.id}
                      {...createPanResponder(s).panHandlers}
                      style={{
                        position: 'absolute',
                        left: s.x,
                        top: s.y,
                        zIndex: selectedStickerId === s.id ? 100 : 10,
                        pointerEvents: tab === 'sticker' ? 'auto' : 'none',
                      }}
                    >
                      <TouchableOpacity 
                        activeOpacity={0.8}
                        className="items-center justify-center"
                        onPress={() => setSelectedStickerId(s.id)}
                      >
                         {selectedStickerId === s.id && (
                           <View className="absolute -top-10 flex-row bg-black/80 rounded-full px-2 py-1 items-center gap-2">
                              <TouchableOpacity onPress={() => resizeSticker(s.id, -10)} className="p-1">
                                <Minus size={16} color="#fff" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => resizeSticker(s.id, 10)} className="p-1">
                                <Plus size={16} color="#fff" />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => removeSticker(s.id)} className="p-1">
                                <X size={16} color="#ff4444" />
                              </TouchableOpacity>
                           </View>
                         )}
                         <Text style={{ fontSize: s.size }}>{s.emoji}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                </View>
              </ViewShot>
            </View>

            {/* Toolbar */}
            <View className="bg-black/80 border-t border-white/10 px-4 pb-10 pt-4">
              
              {/* Tab Content */}
              <View className="mb-6 items-center justify-center">
                {tab === 'crop' && (
                  <View className="flex-row gap-4 items-center">
                    <TouchableOpacity onPress={handleRotate} className="flex-row items-center bg-white/10 px-4 py-2 rounded-xl">
                       <RotateCw size={18} color="#fff" className="mr-2" />
                       <Text className="text-white text-xs font-medium">Xoay 90°</Text>
                    </TouchableOpacity>
                    {ASPECT_OPTIONS.map((opt, i) => (
                      <TouchableOpacity key={i} className="p-2">
                        <Text className="text-white/60 text-[10px] font-bold">{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {tab === 'draw' && (
                  <View className="flex-col gap-4">
                    <View className="flex-row gap-3">
                      {BRUSH_COLORS.map(c => (
                        <TouchableOpacity 
                          key={c} 
                          onPress={() => setBrushColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-7 h-7 rounded-full border-2 ${brushColor === c ? 'border-primary' : 'border-white/20'}`}
                        />
                      ))}
                    </View>
                    <View className="flex-row gap-5 justify-center">
                      {BRUSH_SIZES.map((s, i) => (
                        <TouchableOpacity key={i} onPress={() => setBrushSizeIdx(i)} className="p-2">
                           <View style={{ width: s+2, height: s+2 }} className={`bg-white rounded-full ${brushSizeIdx === i ? 'ring-2 ring-primary' : ''}`} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {tab === 'sticker' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="max-h-16">
                    {STICKER_EMOJIS.map(emoji => (
                      <TouchableOpacity key={emoji} onPress={() => addSticker(emoji)} className="p-3">
                        <Text className="text-2xl">{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Tab Switcher */}
              <View className="flex-row justify-center gap-8">
                <TouchableOpacity 
                  onPress={() => setTab('crop')}
                  className={`items-center px-4 py-2 rounded-2xl ${tab === 'crop' ? 'bg-primary/20' : ''}`}
                >
                  <CropIcon size={24} color={tab === 'crop' ? COLORS.primary : '#666'} />
                  <Text className={`text-[10px] mt-1 font-bold ${tab === 'crop' ? 'text-primary' : 'text-gray-500'}`}>CẮT / XOAY</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTab('draw')}
                  className={`items-center px-4 py-2 rounded-2xl ${tab === 'draw' ? 'bg-primary/20' : ''}`}
                >
                  <Pencil size={24} color={tab === 'draw' ? COLORS.primary : '#666'} />
                  <Text className={`text-[10px] mt-1 font-bold ${tab === 'draw' ? 'text-primary' : 'text-gray-500'}`}>VẼ TAY</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTab('sticker')}
                  className={`items-center px-4 py-2 rounded-2xl ${tab === 'sticker' ? 'bg-primary/20' : ''}`}
                >
                  <Smile size={24} color={tab === 'sticker' ? COLORS.primary : '#666'} />
                  <Text className={`text-[10px] mt-1 font-bold ${tab === 'sticker' ? 'text-primary' : 'text-gray-500'}`}>STICKER</Text>
                </TouchableOpacity>
              </View>

              {/* Caption */}
              <View className="mt-6 bg-white/10 rounded-2xl flex-row items-center px-4 py-2">
                <TextInput
                  placeholder="Thêm chú thích..."
                  placeholderTextColor="#999"
                  className="flex-1 text-white py-2 font-medium"
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                />
              </View>
            </View>
          </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
