import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { COLORS } from '../../../constants';

interface AudioPlayerProps {
  url: string;
  isMe: boolean;
}

const AudioPlayer = ({ url, isMe }: AudioPlayerProps) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const playPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        if (position >= duration && duration > 0) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
      }
    } else {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );
      setSound(newSound);
    }
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatTime = (millis: number) => {
    const totalSeconds = millis / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const bars = Array.from({ length: 15 }, (_, i) => Math.sin(i * 0.5) * 10 + 15);

  return (
    <View className={`flex-row items-center px-4 py-3 rounded-[24px] border shadow-sm min-w-[220px] ${isMe ? 'bg-primary border-orange-500/20' : 'bg-white border-gray-100'}`}>
      <TouchableOpacity 
        onPress={playPause}
        className={`w-11 h-11 rounded-full flex items-center justify-center mr-3 shadow-sm ${isMe ? 'bg-white' : 'bg-orange-500'}`}
      >
        {isPlaying ? (
          <Pause size={18} color={isMe ? COLORS.primary : '#fff'} fill={isMe ? COLORS.primary : '#fff'} />
        ) : (
          <Play size={18} color={isMe ? COLORS.primary : '#fff'} fill={isMe ? COLORS.primary : '#fff'} className="ml-1" />
        )}
      </TouchableOpacity>

      <View className="flex-1 justify-center">
        {/* Waveform Mockup */}
        <View className="flex-row items-end h-6 mb-2 gap-[2px]">
          {bars.map((h, i) => (
            <View 
              key={i} 
              style={{ 
                height: h, 
                backgroundColor: i / bars.length * 100 <= progress ? (isMe ? '#fff' : COLORS.primary) : (isMe ? 'rgba(255,255,255,0.3)' : '#f3f4f6'),
                width: 3,
                borderRadius: 2
              }} 
            />
          ))}
        </View>

        {/* Progress bar */}
        <View className={`h-1 rounded-full overflow-hidden ${isMe ? 'bg-white/20' : 'bg-gray-100'}`}>
          <View style={{ width: `${progress}%` }} className={`h-1 ${isMe ? 'bg-white' : 'bg-primary'}`} />
        </View>
        
        <View className="flex-row justify-between mt-1.5 px-0.5">
          <Text className={`text-[9px] font-bold ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
            {isPlaying ? formatTime(position) : 'Tin nhắn thoại'}
          </Text>
          <Text className={`text-[9px] font-bold ${isMe ? 'text-white/90' : 'text-primary'}`}>
            {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default AudioPlayer;
