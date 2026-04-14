import { kvGet, kvSet, kvRemove } from './database';
import { safeParse } from '../utils/safeParse';

const STORAGE_KEY = 'pro_status';

export interface ProDetails {
  purchased: boolean;
  productId: string;
  purchaseDate: string;
  purchaseToken?: string;
}

function isValidProDetails(v: unknown): v is ProDetails {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as ProDetails).purchased === 'boolean' &&
    typeof (v as ProDetails).productId === 'string' &&
    typeof (v as ProDetails).purchaseDate === 'string'
  );
}

export function isProUser(): boolean {
  const raw = kvGet(STORAGE_KEY);
  if (!raw) return false;
  const parsed = safeParse<unknown>(raw, null);
  if (!parsed || !isValidProDetails(parsed)) return false;
  return parsed.purchased === true;
}

export function getProDetails(): ProDetails | null {
  const raw = kvGet(STORAGE_KEY);
  if (!raw) return null;
  const parsed = safeParse<unknown>(raw, null);
  if (!parsed || !isValidProDetails(parsed)) return null;
  return parsed;
}

export function setProStatus(details: ProDetails): void {
  kvSet(STORAGE_KEY, JSON.stringify(details));
}

export function clearProStatus(): void {
  kvRemove(STORAGE_KEY);
}
