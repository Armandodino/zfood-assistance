import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiUrl(): string {
  const expoPublicDomain = Constants.expoConfig?.extra?.EXPO_PUBLIC_DOMAIN || 
    process.env.EXPO_PUBLIC_DOMAIN;
  
  if (expoPublicDomain) {
    return `https://${expoPublicDomain}`;
  }
  
  if (Platform.OS === 'web') {
    return '';
  }
  
  return 'http://localhost:5000';
}
