import { useState, useCallback } from 'react';
import { kvGet, kvSet, kvRemove } from '../services/database';
import { TUTORIAL_TIPS, type TutorialTip } from '../data/tutorialTips';

const KEY_PREFIX = 'tutorial_dismissed_';

interface UseTutorialResult {
  showTutorial: boolean;
  tips: TutorialTip[];
  currentIndex: number;
  nextTip: () => void;
  prevTip: () => void;
  dismiss: () => void;
}

export function useTutorial(screenKey: string): UseTutorialResult {
  const tips = TUTORIAL_TIPS[screenKey] ?? [];
  const [showTutorial, setShowTutorial] = useState(() => {
    if (!tips || tips.length === 0) return false;
    try {
      const dismissed = kvGet(KEY_PREFIX + screenKey);
      return dismissed == null;
    } catch {
      return false;
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTip = useCallback(() => {
    setCurrentIndex((i) => (i < tips.length - 1 ? i + 1 : i));
  }, [tips.length]);

  const prevTip = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : 0));
  }, []);

  const dismiss = useCallback(() => {
    try {
      kvSet(KEY_PREFIX + screenKey, 'true');
    } catch {}
    setShowTutorial(false);
  }, [screenKey]);

  return { showTutorial, tips, currentIndex, nextTip, prevTip, dismiss };
}

export function resetAllTutorials(): void {
  for (const key of Object.keys(TUTORIAL_TIPS)) {
    try {
      kvRemove(KEY_PREFIX + key);
    } catch {}
  }
}
