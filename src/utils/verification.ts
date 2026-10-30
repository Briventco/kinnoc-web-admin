import type { AdminUserSummary, AuditAction, VerificationCategory } from '../types/verification';

const CATEGORY_LABELS: Record<VerificationCategory, string> = {
  FOUNDER: 'Founder',
  STUDENT_LEADER: 'Student leader',
  COMMUNITY_LEADER: 'Community leader',
  ORGANISATION_REPRESENTATIVE: 'Organisation representative',
  OTHER: 'Other',
};

export function verificationCategoryLabel(category: VerificationCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  GRANTED: 'Verification granted',
  UPDATED: 'Verification updated',
  REVOKED: 'Verification revoked',
  APPLICATION_APPROVED: 'Application approved',
  APPLICATION_REJECTED: 'Application rejected',
};

export function auditActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action] ?? action;
}

/** "Ada Lovelace (@ada)", falling back to whatever is known. */
export function userLabel(user: AdminUserSummary | null): string {
  if (!user) return 'Unknown user';
  if (user.displayName && user.username) return `${user.displayName} (@${user.username})`;
  if (user.username) return `@${user.username}`;
  return user.displayName ?? user.id;
}

/** The path segment for a user's page: their username when they have one, else their ID. */
export function userRef(user: AdminUserSummary): string {
  return user.username ?? user.id;
}

/**
 * An <input type="datetime-local"> value (the admin's own time zone) → ISO with Z.
 * Returns undefined for empty input and null for an invalid one.
 */
export function localDateTimeToIso(value: string): string | undefined | null {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** A problem with an optional expiry, or undefined. The API requires it to be in the future. */
export function expiryProblem(value: string): string | undefined {
  const iso = localDateTimeToIso(value);
  if (iso === null) return 'Enter a valid date and time.';
  if (iso && new Date(iso).getTime() <= Date.now()) return 'The expiry must be in the future.';
  return undefined;
}

export interface VerificationDetailsValues {
  category: VerificationCategory | '';
  organisation: string;
  position: string;
}

export type VerificationDetailsErrors = Partial<Record<keyof VerificationDetailsValues, string>>;

/** Mirrors the API: category required, organisation 2–150 and position 2–100 characters. */
export function validateVerificationDetails(values: VerificationDetailsValues): VerificationDetailsErrors {
  const errors: VerificationDetailsErrors = {};
  if (!values.category) errors.category = 'Choose a category.';
  const organisation = values.organisation.trim().length;
  if (organisation < 2 || organisation > 150) errors.organisation = 'Use 2–150 characters.';
  const position = values.position.trim().length;
  if (position < 2 || position > 100) errors.position = 'Use 2–100 characters.';
  return errors;
}

/**
 * Why a direct grant isn't possible right now, or null when it is. Mirrors the
 * API: not yourself, an active account, a profile, and not already verified.
 * (An expired verification is renewed by editing its expiry instead.)
 */
export function grantBlocker(
  user: AdminUserSummary,
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | null,
  currentUserId: string | undefined,
): string | null {
  if (user.id === currentUserId) return 'You cannot verify yourself. Another administrator has to do it.';
  if (user.accountStatus !== 'ACTIVE') return 'This account is suspended or deactivated, so it cannot be verified.';
  if (!user.username) return 'This user has not created a profile yet, so there is nowhere to show the badge.';
  if (status === 'ACTIVE') return 'This user is already verified. Edit the existing verification instead.';
  if (status === 'EXPIRED') return 'This verification has expired. Renew it by setting a new expiry below.';
  return null;
}
