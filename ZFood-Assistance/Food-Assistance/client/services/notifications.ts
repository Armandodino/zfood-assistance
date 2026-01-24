import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const NOTIFICATION_PERMISSION_KEY = '@zfood_notification_permission';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: any = null;

async function loadNotifications() {
  if (!isExpoGo && Platform.OS !== 'web') {
    try {
      Notifications = await import('expo-notifications');
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (e) {
      console.log('Notifications not available');
    }
  }
}

loadNotifications();

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, granted ? 'true' : 'false');
    
    return granted;
  } catch (e) {
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo || !Notifications) {
    return false;
  }
  
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (e) {
    return false;
  }
}

export async function scheduleUnpaidReminder(
  clientName: string,
  amount: number,
  orderId: string,
  delayInHours: number = 24
): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    return null;
  }

  const hasPermission = await checkNotificationPermission();
  
  if (!hasPermission) {
    const granted = await requestNotificationPermission();
    if (!granted) return null;
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rappel de paiement',
        body: `${clientName} doit ${amount.toLocaleString()} FCFA`,
        data: { orderId, type: 'unpaid_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delayInHours * 60 * 60,
      },
    });

    return identifier;
  } catch (e) {
    return null;
  }
}

export async function scheduleImmediateNotification(
  title: string,
  body: string
): Promise<void> {
  if (isExpoGo || !Notifications) {
    return;
  }

  const hasPermission = await checkNotificationPermission();
  
  if (!hasPermission) {
    await requestNotificationPermission();
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: null,
    });
  } catch (e) {
    console.log('Notification not sent');
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (e) {}
}

export async function cancelAllNotifications(): Promise<void> {
  if (isExpoGo || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {}
}

export async function getScheduledNotifications(): Promise<any[]> {
  if (isExpoGo || !Notifications) return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (e) {
    return [];
  }
}
