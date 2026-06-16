import 'react-native-gesture-handler';
import "./global.css";
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AuthStack from './src/navigation/AuthStack';
import MainTabs from './src/navigation/MainTabs';
import { useAuthStore } from './src/contexts/authContext';
import { initDatabase } from './src/services/sqlite/database';
import socketService from './src/services/socket/socketService';
import { navigationRef } from './src/navigation/navigationRef';


// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const initialize = useAuthStore(state => state.initialize);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    const startup = async () => {
      // 1. Initialize Auth
      await initialize();
      
      // 2. Initialize SQLite
      try {
        await initDatabase();
      } catch (e) {
        console.error('Database init failed', e);
      }
    };
    startup();
  }, [initialize]);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  if (!fontsLoaded || isLoading) {
    return null;
  }

  const prefix = Linking.createURL('/');
  
  const linking = {
    prefixes: [prefix, 'https://ecommerce-frontend-three-rosy.vercel.app'],
    config: {
      screens: {
        Home: {
          screens: {
            QRScannerScreen: 'qr/:type/:id',
          }
        }
      }
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} linking={linking}>
          {isAuthenticated ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
