/** Mirrors kinnoc-api src/verification/dto (verification.dto.ts and verification.response.ts). */

export const VERIFICATION_CATEGORIES = [
  'FOUNDER',
  'STUDENT_LEADER',
  'COMMUNITY_LEADER',
  'ORGANISATION_REPRESENTATIVE',
  'OTHER',
] as const;
export type VerificationCategory = (typeof VERIFICATION_CATEGORIES)[number];

export const APPLICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Effective status of a record: expiry is applied by the API when it is read. */
export const VERIFICATION_STATUSES = ['ACTIVE', 'EXPIRED', 'REVOKED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type AuditAction = 'GRANTED' | 'UPDATED' | 'REVOKED' | 'APPLICATION_APPROVED' | 'APPLICATION_REJECTED';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

/** `AdminUserSummary`. `id` is the Kinnoc user ID (the same as the Supabase Auth user ID). */
export interface AdminUserSummary {
  id: string;
  username: string | null;
  displayName: string | null;
  accountStatus: AccountStatus;
}

/** `AdminVerificationResponse`. Dates are ISO strings. */
export interface AdminVerification {
  id: string;
  user: AdminUserSummary;
  status: VerificationStatus;
  isActive: boolean;
  category: VerificationCategory;
  organisation: string;
  position: string;
  grantedAt: string;
  grantedBy: AdminUserSummary | null;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedBy: AdminUserSummary | null;
  /** Internal; never shown to the user or the public. */
  revocationReason: string | null;
  /** The approved application behind the current grant; null for direct grants. */
  applicationId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `AdminApplicationResponse`. */
export interface AdminApplication {
  id: string;
  status: ApplicationStatus;
  category: VerificationCategory;
  organisation: string;
  position: string;
  statement: string;
  submittedAt: string;
  reviewedAt: string | null;
  withdrawnAt: string | null;
  user: AdminUserSummary;
  reviewedBy: AdminUserSummary | null;
  /** Internal; never shown to the applicant. */
  reviewNotes: string | null;
}

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actor: AdminUserSummary | null;
  applicationId: string | null;
  /** Values set, `changes: { field: { from, to } }` for updates, notes and reasons. */
  details: Record<string, unknown>;
  createdAt: string;
}

/** `GET /admin/verifications/users/:userRef`. */
export interface AdminUserVerification {
  user: AdminUserSummary;
  verification: AdminVerification | null;
  /** The latest 50 audit entries, newest first. */
  history: AuditEntry[];
}

export interface ApprovalResult {
  application: AdminApplication;
  verification: AdminVerification;
}

export interface ApproveApplicationInput {
  expiresAt?: string;
  notes?: string;
}

export interface GrantVerificationInput {
  category: VerificationCategory;
  organisation: string;
  position: string;
  expiresAt?: string;
  note?: string;
}

/** Omitted fields are unchanged; `expiresAt: null` removes the expiry. */
export interface UpdateVerificationInput {
  category?: VerificationCategory;
  organisation?: string;
  position?: string;
  expiresAt?: string | null;
  note?: string;
}

export interface VerificationListQuery {
  status?: VerificationStatus;
  category?: VerificationCategory;
  limit?: number;
  cursor?: string;
}

/** The API defaults `status` to PENDING (oldest first); other statuses are newest first. */
export interface ApplicationListQuery {
  status?: ApplicationStatus;
  category?: VerificationCategory;
  limit?: number;
  cursor?: string;
}
