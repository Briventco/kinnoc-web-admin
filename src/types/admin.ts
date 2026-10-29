/** `GET /admin/me` — returned only for active ADMIN accounts (403 for everyone else). */
export interface AdminSession {
  email: string | null;
  role: 'ADMIN';
  username: string | null;
  displayName: string | null;
}
