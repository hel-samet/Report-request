export interface Report {
  id: string;
  requesterName: string;
  campus: string;
  importDate: string;
  exportDate: string;
  items: Record<string, number>;
  status: 'Process' | 'Done';
}

export type UserRole = 'Admin' | 'User';

export interface User {
  id: string;
  username: string;
  password: string; // In a real app, this is a hash. For this demo, plaintext is fine.
  role: UserRole;
}
