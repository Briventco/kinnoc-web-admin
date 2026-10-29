import type { AdminSession } from '../types/admin';
import { apiRequest } from './client';

/** 200 for an active ADMIN; 403 INSUFFICIENT_ROLE (or an account code) for anyone else. */
export function getAdminMe(): Promise<AdminSession> {
  return apiRequest<AdminSession>('/admin/me');
}
