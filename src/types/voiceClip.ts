export interface VoiceClip {
  id: string;
  memoId: string;
  uri: string;
  duration: number;
  position: number;
  label: string | null;
  createdAt: string;
}
