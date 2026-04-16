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
  // TODO(v2.0.0): REVERT — this is a TWO-PLACE revert. Missing either edit
  // leaves a paywall bypass vector on v2.0.0.
  //
  // v1.23.0 intentionally grants founding status to every first-launch device
  // (fresh install OR upgrade) so the paywall stays dormant until multiplayer
  // lands in v2.0.0. Anyone who installs DFW during the v1.23.0 window is
  // grandfathered into Pro forever.
  //
  // `runFoundingMigration` is invoked from TWO call sites:
  //   • App.tsx — cold-start (success path + _migrated recovery path)
  //   • src/services/backupRestore.ts — inside `importBackup`, after
  //     `reopenDb()`, so a restored backup can't strand a v1.23.0 founding
  //     user in non-Pro state.
  //
  // When shipping v2.0.0, BOTH of these changes must land together:
  //
  // 1. HERE (src/services/foundingStatus.ts): wrap the grant block below in
  //    `if (kvGet(ONBOARDING_KEY) === 'true')` so fresh v2.0.0 installs fall
  //    through and hit the paywall as intended. Post-revert, a fresh device
  //    has no `onboardingComplete` key yet, so the grant is skipped; the
  //    paywall activates and the user must pay normally.
  //
  // 2. src/services/backupRestore.ts: DELETE the `runFoundingMigration()`
  //    call inside `importBackup`. A v2.0.0 user cannot legitimately be a
  //    founding user (they install after the grandfather window closed), so
  //    there is nothing to grant after a restore. If the call stays,
  //    restoring ANY pre-v1.23.0 .dfw backup — which still has
  //    `onboardingComplete='true'` in its kv_store — would cause the
  //    post-revert gate here to see the onboarding key (from the restored
  //    kv, not from local onboarding) and silently grant founding on a
  //    fresh v2.0.0 device. That turns every old backup into a universal
  //    paywall bypass.
  //
  // Both edits are required; shipping either one alone is insufficient.
  // On revert day: grep the v2.0.0 revert tag across src/ to surface this
  // block, then grep `runFoundingMigration\(` across src/ to verify no
  // additional call sites have been added since v1.23.0 — if there are
  // more, each needs the same "delete the call" treatment that
  // backupRestore.ts gets.
  if (kvGet(FOUNDING_CHECK_KEY)) return;

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
