import { kvGet, kvSet } from './database';
import { isProUser, setProStatus } from './proStatus';
import { safeParse } from '../utils/safeParse';

const FOUNDING_CHECK_KEY = 'founding_check_done';
const FOUNDING_STATUS_KEY = 'founding_status';
const ONBOARDING_KEY = 'onboardingComplete';

export interface FoundingDetails {
  isFoundingUser: boolean;
  grantedAt: string;
}

function isValidFoundingDetails(v: unknown): v is FoundingDetails {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as FoundingDetails).isFoundingUser === 'boolean' &&
    typeof (v as FoundingDetails).grantedAt === 'string'
  );
}

export function runFoundingMigration(): void {
  if (kvGet(FOUNDING_CHECK_KEY)) return;

  if (kvGet(ONBOARDING_KEY) === 'true') {
    const now = new Date().toISOString();
    if (!isProUser()) {
      setProStatus({
        purchased: true,
        productId: 'founding_user',
        purchaseDate: now,
      });
    }
    kvSet(
      FOUNDING_STATUS_KEY,
      JSON.stringify({ isFoundingUser: true, grantedAt: now }),
    );
  }

  kvSet(FOUNDING_CHECK_KEY, 'true');
}

export function isFoundingUser(): boolean {
  const raw = kvGet(FOUNDING_STATUS_KEY);
  if (!raw) return false;
  const parsed = safeParse<unknown>(raw, null);
  if (!parsed || !isValidFoundingDetails(parsed)) return false;
  return parsed.isFoundingUser === true;
}

export function getFoundingDetails(): FoundingDetails | null {
  const raw = kvGet(FOUNDING_STATUS_KEY);
  if (!raw) return null;
  const parsed = safeParse<unknown>(raw, null);
  if (!parsed || !isValidFoundingDetails(parsed)) return null;
  return parsed;
}
