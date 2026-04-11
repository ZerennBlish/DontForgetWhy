import type { VoiceClip } from './voiceClip';

export interface VoiceMemo {
  id: string;
  uri: string;
  title: string;
  note: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  noteId?: string | null;
  clips?: VoiceClip[];
  clipCount?: number;
  totalDuration?: number;
}
