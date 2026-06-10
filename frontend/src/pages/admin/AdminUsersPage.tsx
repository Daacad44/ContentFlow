import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { AppShell } from '../../components/AppShell';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    api.get<{ data: { items: AdminUser[] } }>('/users').then((r) => setUsers(r.data.data.items));
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await api.patch(`/users/${id}/active`, { isActive: !isActive });
    const r = await api.get<{ data: { items: AdminUser[] } }>('/users');
    setUsers(r.data.data.items);
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">User Management</h1>

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink-500/60">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-ink-500 bg-ink-800">
            <tr>
              {['Name', 'Email', 'Role', 'Status', 'Verified', 'Actions'].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-ink-500/40">
                <td className="px-4 py-3 text-white">{u.fullName}</td>
                <td className="px-4 py-3 text-muted">{u.email}</td>
                <td className="px-4 py-3 text-white">{u.role}</td>
                <td className="px-4 py-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3">{u.emailVerified ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(u.id, u.isActive)}
                    className="text-xs text-brand hover:underline"
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
