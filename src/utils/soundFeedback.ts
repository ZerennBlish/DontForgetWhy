import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform } from 'react-native';

let feedbackChannelCreated = false;

export async function playModeFeedbackChirp(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (!feedbackChannelCreated) {
      await notifee.createChannel({
        id: 'sound_feedback_v2',
        name: 'UI Feedback',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: false,
      });
      feedbackChannelCreated = true;
    }
    const notifId = await notifee.displayNotification({
      id: 'sound_feedback',
      body: ' ',
      android: {
        channelId: 'sound_feedback_v2',
        smallIcon: 'ic_notification',
        autoCancel: true,
        asForegroundService: false,
        onlyAlertOnce: false,
      },
    });
    // Give the sound time to play before cancelling
    setTimeout(() => {
      notifee.cancelNotification(notifId);
    }, 1500);
  } catch (e) {
    // Non-critical — fail silently
  }
}
