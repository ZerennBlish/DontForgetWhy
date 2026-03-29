# DFW Data Models
**Part of the DFW Technical Reference** — 6 docs: Architecture, Data-Models, Features, Bug-History, Decisions, Project-Setup
**Last updated:** March 29, 2026

---

## 1. Alarm

```typescript
interface Alarm {
  id: string; time: string; nickname?: string; note: string; quote: string;
  enabled: boolean; mode: 'recurring' | 'one-time'; days: AlarmDay[];
  date: string | null; category: AlarmCategory; icon?: string;
  private: boolean; guessWhy?: boolean; createdAt: string;
  notificationIds: string[]; soundId?: string; soundUri?: string | null;
  soundName?: string | null; soundID?: number | null;
  photoUri?: string | null;  // per-alarm wake-up photo (P2 2.4)
  deletedAt?: string | null;
}
```

**Alarm photo storage:** Photos stored at `${Paths.document}alarm-photos/`. Filename: `alarm_${alarmId}_${timestamp}.jpg`. Service: `src/services/alarmPhotoStorage.ts` — `saveAlarmPhoto`, `deleteAlarmPhoto`, `alarmPhotoExists`. Deferred save pattern: photo stays in ImagePicker temp cache during form editing, only copied to permanent storage when alarm save succeeds. Old photo deleted only after new one confirmed. Cancel never touches filesystem. Photo cleanup: `permanentlyDeleteAlarm` and `purgeDeletedAlarms` (30-day) both delete photo files. Soft-delete keeps photo on disk.

---

## 2. Reminder

```typescript
interface Reminder {
  id: string; icon: string; text: string; nickname?: string;
  private: boolean; completed: boolean; createdAt: string;
  completedAt: string | null; dueDate: string | null; dueTime: string | null;
  notificationId: string | null; pinned: boolean; deletedAt?: string | null;
  days?: string[]; recurring?: boolean; notificationIds?: string[];
  completionHistory?: CompletionEntry[]; soundId?: string;
}
```

---

## 3. Note

```typescript
interface Note {
  id: string; text: string; icon: string; color: string;
  fontColor: string; pinned: boolean; createdAt: string;
  updatedAt: string; deletedAt: string | null;
  images?: string[];  // file:// URIs to locally stored images (max 3)
}
```

**Image storage:** Images stored on filesystem at `${FileSystem.documentDirectory}note-images/`. Photos: `${noteId}_${timestamp}_${uuid8}.jpg`. Drawings: `${noteId}_${timestamp}_${uuid8}.png` + companion `.json` (stroke data for re-editing). Service: `src/services/noteImageStorage.ts` — `saveNoteImage` detects .png/.jpg extension, copies companion .json alongside PNGs. `deleteNoteImage` also deletes companion .json. `loadDrawingData` reads companion .json (early-returns null for .jpg). `getDrawingJsonUri` derives .json path from .png path. All use directory-based File constructors (`new File(dir, filename)`) for reliability. `noteStorage.ts` auto-cleans images on permanent delete and 30-day purge.

---

## 4. ActiveTimer / UserTimer

```typescript
interface ActiveTimer {
  id: string; presetId: string; label: string; icon: string;
  totalSeconds: number; remainingSeconds: number; startedAt: string;
  isRunning: boolean; notificationId?: string; soundId?: string;
}
interface UserTimer {
  id: string; icon: string; label: string; seconds: number;
  createdAt: string; soundId?: string;
}
```

---

## 5. Key AsyncStorage Keys

`'alarms'`, `'reminders'`, `'activeTimers'`, `'notes'`, `'userTimers'`, `'appSettings'`, `'silenceAllAlarms'`, `'appTheme'`, `'customTheme'`, `'hapticsEnabled'`, `'onboardingComplete'`, `'defaultTimerSound'`, `'bg_main'` (background photo URI), `'bg_overlay_opacity'` (background overlay 0.3-0.8), plus game stats (guessWhyStats, forgetLog, memoryMatchScores, sudokuBestScores, dailyRiddleStats, triviaStats), widget pins (widgetPinnedPresets, widgetPinnedAlarms, widgetPinnedReminders, widgetPinnedNotes), per-alarm (`snoozeCount_{alarmId}`, `snoozing_{alarmId}`), pending actions (pendingTabAction, pendingAlarmAction, pendingReminderAction, pendingNoteAction), notification dedupe (`_handledNotifs` in-memory + `handled_notifs` persistent in AsyncStorage)
