'use client';

import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Badge, Button, EmptyState, ErrorState, Field, Modal } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { AdminUser, Paginated, RoleSummary } from '@/lib/types';

interface AdminFormState {
  name: string;
  email: string;
  password: string;
  roleId: string;
}

const EMPTY_FORM: AdminFormState = { name: '', email: '', password: '', roleId: '' };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // Modals
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<AdminFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : '';
      const [adminsRes, rolesRes] = await Promise.all([
        api<Paginated<AdminUser>>(`/admins${params}`),
        api<RoleSummary[]>('/roles'),
      ]);
      setAdmins(adminsRes.data);
      setRoles(rolesRes);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, roleId: roles[0]?.id ?? '' });
    setFormError(null);
    setEditing('new');
  }

  function openEdit(admin: AdminUser) {
    setForm({
      name: admin.name,
      email: admin.email,
      password: '',
      roleId: admin.role.id,
    });
    setFormError(null);
    setEditing(admin);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editing === 'new') {
        await api<AdminUser>('/admins', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      } else if (editing) {
        const payload: Partial<AdminFormState> = {
          name: form.name,
          email: form.email,
          roleId: form.roleId,
        };
        if (form.password) payload.password = form.password;
        await api<AdminUser>(`/admins/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(admin: AdminUser) {
    setRowError(null);
    try {
      await api<AdminUser>(`/admins/${admin.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !admin.isActive }),
      });
      await load();
    } catch (err) {
      setRowError(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    setFormError(null);
    try {
      await api<void>(`/admins/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            Access
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            Admins
          </h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} aria-hidden /> New admin
        </Button>
      </div>

      <form
        className="mt-6 flex max-w-sm items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft/60"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Search name or email…"
            aria-label="Search admins"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-ink"
          />
        </div>
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      {rowError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {rowError}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !admins || admins.length === 0 ? (
          <EmptyState
            title={query ? 'No admins match your search' : 'No admins yet'}
            hint={
              query
                ? 'Try a different name or email.'
                : 'Create the first admin account to get started.'
            }
            action={
              !query && <Button onClick={openCreate}>New admin</Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">Admin</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{admin.name}</p>
                      <p className="font-mono text-xs text-ink-soft">
                        {admin.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          admin.role.permissions?.includes('*')
                            ? 'gold'
                            : 'neutral'
                        }
                      >
                        {admin.role.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={admin.isActive ? 'success' : 'danger'}>
                        {admin.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          className="rounded px-2 py-1 text-xs text-ink-soft hover:text-ink"
                        >
                          {admin.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                        <button
                          onClick={() => openEdit(admin)}
                          aria-label={`Edit ${admin.name}`}
                          className="rounded p-1.5 text-ink-soft hover:text-ink"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => {
                            setFormError(null);
                            setDeleting(admin);
                          }}
                          aria-label={`Delete ${admin.name}`}
                          className="rounded p-1.5 text-ink-soft hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New admin' : 'Edit admin'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
            >
              {formError}
            </div>
          )}
          <Field
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Field
            label="Password"
            type="password"
            required={editing === 'new'}
            hint={
              editing !== 'new'
                ? 'Leave empty to keep the current password.'
                : 'Min 8 characters with at least one letter and one number.'
            }
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Role</span>
            <select
              required
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing === 'new' ? 'Create admin' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete admin?"
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {formError}
          </div>
        )}
        <p className="text-sm text-ink-soft">
          This permanently removes <strong className="text-ink">{deleting?.name}</strong>{' '}
          ({deleting?.email}). If you only want to revoke access, consider
          deactivating the account instead — that preserves history.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={saving} onClick={handleDelete}>
            Delete permanently
          </Button>
        </div>
      </Modal>
    </div>
  );
}
