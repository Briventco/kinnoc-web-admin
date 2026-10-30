import type { Page } from '../types/api';
import type {
  AdminApplication,
  AdminUserVerification,
  AdminVerification,
  ApplicationListQuery,
  ApplicationStatus,
  ApprovalResult,
  ApproveApplicationInput,
  GrantVerificationInput,
  UpdateVerificationInput,
  VerificationListQuery,
  VerificationStatus,
} from '../types/verification';
import { apiRequest } from './client';
import { countPages, type ItemCount } from './pagination';

/**
 * Admin verification endpoints (kinnoc-api docs/verification.md §3).
 * `userRef` is a Kinnoc user ID or a username. Admins cannot act on their own
 * verification or application (403 CANNOT_TARGET_SELF).
 */

const user = (userRef: string) => `/admin/verifications/users/${encodeURIComponent(userRef)}`;
const application = (id: string) => `/admin/verifications/applications/${encodeURIComponent(id)}`;

/** Verification records, newest grants first. */
export function listVerifications(
  query: VerificationListQuery = {},
  signal?: AbortSignal,
): Promise<Page<AdminVerification>> {
  return apiRequest<Page<AdminVerification>>('/admin/verifications', { query: { ...query }, signal });
}

export function listApplications(
  query: ApplicationListQuery = {},
  signal?: AbortSignal,
): Promise<Page<AdminApplication>> {
  return apiRequest<Page<AdminApplication>>('/admin/verifications/applications', {
    query: { ...query },
    signal,
  });
}

export function getApplication(id: string, signal?: AbortSignal): Promise<AdminApplication> {
  return apiRequest<AdminApplication>(application(id), { signal });
}

export function approveApplication(id: string, input: ApproveApplicationInput): Promise<ApprovalResult> {
  return apiRequest<ApprovalResult>(`${application(id)}/approve`, { method: 'POST', body: input });
}

/** `notes` is an internal reason, never shown to the applicant. */
export function rejectApplication(id: string, notes?: string): Promise<AdminApplication> {
  return apiRequest<AdminApplication>(`${application(id)}/reject`, {
    method: 'POST',
    body: notes ? { notes } : {},
  });
}

/** The user, their record (or null) and the latest 50 audit entries. */
export function getUserVerification(userRef: string, signal?: AbortSignal): Promise<AdminUserVerification> {
  return apiRequest<AdminUserVerification>(user(userRef), { signal });
}

export function grantVerification(userRef: string, input: GrantVerificationInput): Promise<AdminVerification> {
  return apiRequest<AdminVerification>(`${user(userRef)}/grant`, { method: 'POST', body: input });
}

/** `reason` is internal, never shown to the user or the public. */
export function revokeVerification(userRef: string, reason?: string): Promise<AdminVerification> {
  return apiRequest<AdminVerification>(`${user(userRef)}/revoke`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export function updateVerification(userRef: string, input: UpdateVerificationInput): Promise<AdminVerification> {
  return apiRequest<AdminVerification>(user(userRef), { method: 'PATCH', body: input });
}

export function countApplications(status: ApplicationStatus, signal?: AbortSignal): Promise<ItemCount> {
  return countPages((cursor) => listApplications({ status, limit: 50, cursor }, signal));
}

export function countVerifications(status: VerificationStatus, signal?: AbortSignal): Promise<ItemCount> {
  return countPages((cursor) => listVerifications({ status, limit: 50, cursor }, signal));
}
