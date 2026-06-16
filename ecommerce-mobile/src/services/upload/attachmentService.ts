import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import apiClient from '../../api/client';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for video/images

export const pickAndUploadImages = async () => {
  try {
    let { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      // Cố tình không chặn bằng `if (status !== 'granted') return` ở đây.
      // Điều này giúp bypass lỗi đọc quyền sai của MIUI Android 12, 
      // đồng thời cho phép Photo Picker của Android 13+ và iOS 14+ hoạt động tự do.
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: false,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const uploadPromises = result.assets.map(async (asset) => {
      // Check file size using expo-file-system
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      if (!fileInfo.exists || (fileInfo.size && fileInfo.size > MAX_FILE_SIZE)) {
        Alert.alert('Lỗi', `File ${asset.uri.split('/').pop()} quá lớn (tối đa 100MB)`);
        return null; // Skip invalid or too large
      }

      const formData = new FormData();
      let filename = asset.uri.split('/').pop() || 'media.jpg';
      const isVideo = asset.type === 'video' || asset.uri.endsWith('.mp4');
      
      // Fix missing extension issue after edit
      if (!filename.includes('.')) {
        filename = isVideo ? `${filename}.mp4` : `${filename}.jpg`;
      }

      const match = /\.(\w+)$/.exec(filename);
      const type = isVideo ? `video/${match ? match[1] : 'mp4'}` : `image/${match ? match[1] : 'jpeg'}`;
      
      // @ts-ignore
      formData.append('file', { uri: asset.uri, name: filename, type });

      try {
        const response = await apiClient.post(`/chat/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { 
          success: true, 
          url: response.data.url, 
          type: isVideo ? 'VIDEO' : 'IMAGE',
          localUri: asset.uri 
        };
      } catch (err) {
        console.error('Upload error for file:', filename, err);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(r => r !== null); 
  } catch (error) {

    console.error('Image pick and upload error:', error);
    Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng thử lại sau.');
    return [];
  }
};

export const pickAndUploadDocument = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return null;

    const asset = result.assets[0];
    if (asset.size && asset.size > 100 * 1024 * 1024) { // 100MB
      Alert.alert('Lỗi', 'File không được vượt quá 100MB');
      return null;
    }

    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/octet-stream' });
    
    const response = await apiClient.post(`/chat/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    
    return { success: true, url: response.data.url, type: 'FILE', name: asset.name };
  } catch (error) {
    console.error('Document upload error:', error);
    Alert.alert('Lỗi', 'Không thể tải tài liệu lên.');
    return null;
  }
};

export const uploadAudio = async (uri: string) => {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'voice.m4a';
    
    // @ts-ignore
    formData.append('file', { uri, name: filename, type: 'audio/m4a' });

    const response = await apiClient.post(`/chat/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
    });

    return response.data;
  } catch (error) {
    console.error('Audio upload error:', error);
    return null;
  }
};
