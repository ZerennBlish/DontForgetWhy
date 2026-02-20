jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('channel-id'),
    displayNotification: jest.fn().mockResolvedValue('notification-id'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    createTriggerNotification: jest.fn().mockResolvedValue('trigger-id'),
    cancelTriggerNotification: jest.fn().mockResolvedValue(undefined),
    cancelTriggerNotifications: jest.fn().mockResolvedValue(undefined),
    getTriggerNotificationIds: jest.fn().mockResolvedValue([]),
    onForegroundEvent: jest.fn().mockReturnValue(() => {}),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  },
  TriggerType: { TIMESTAMP: 0 },
  RepeatFrequency: { NONE: 0, HOURLY: 1, DAILY: 2, WEEKLY: 3 },
  AndroidImportance: { HIGH: 4, DEFAULT: 3, LOW: 2 },
  AndroidCategory: { ALARM: 'alarm' },
  AuthorizationStatus: { DENIED: 0, AUTHORIZED: 1, PROVISIONAL: 2 },
  EventType: { DISMISSED: 0, DELIVERED: 1, PRESS: 2, ACTION_PRESS: 3 },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn().mockResolvedValue([]),
  multiRemove: jest.fn().mockResolvedValue(undefined),
}));
