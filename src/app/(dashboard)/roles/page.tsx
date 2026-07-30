'use client';

import { Lock, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Code,
  EmptyState,
  ErrorState,
  Field,
  Modal,
} from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useApiError } from '@/lib/errors';
import { PermissionCatalog, RoleSummary } from '@/lib/types';

interface RoleFormState {
  name: string;
  description: string;
  permissions: string[];
}

const EMPTY_FORM: RoleFormState = { name: '', description: '', permissions: [] };

export default function RolesPage() {
  const t = useTranslations('roles');
  const tCommon = useTranslations('common');
  const resolveError = useApiError();

  const [roles, setRoles] = useState<RoleSummary[] | null>(null);
  const [catalog, setCatalog] = useState<PermissionCatalog>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<RoleSummary | 'new' | null>(null);
  const [deleting, setDeleting] = useState<RoleSummary | null>(null);
  const [form, setForm] = useState<RoleFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Permission keys always render as-is in LTR code style (AC 7.4-2). Their
  // human-readable descriptions and module group labels are translated.
  const moduleLabel = useCallback(
    (module: string) =>
      t.has(`modules.${module}`) ? t(`modules.${module}`) : module,
    [t],
  );
  const permissionLabel = useCallback(
    (key: string) =>
      t.has(`permissions.${key}`) ? t(`permissions.${key}`) : key,
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, catalogRes] = await Promise.all([
        api<RoleSummary[]>('/roles'),
        api<PermissionCatalog>('/roles/permissions/catalog'),
      ]);
      setRoles(rolesRes);
      setCatalog(catalogRes);
    } catch (err) {
      setError(err instanceof ApiError ? resolveError(err) : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [resolveError, t]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing('new');
  }

  function openEdit(role: RoleSummary) {
    setForm({
      name: role.name,
      description: role.description ?? '',
      permissions: [...role.permissions],
    });
    setFormError(null);
    setEditing(role);
  }

  function togglePermission(key: string) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }));
  }

  function setModule(keys: string[], enabled: boolean) {
    setForm((prev) => ({
      ...prev,
      permissions: enabled
        ? Array.from(new Set([...prev.permissions, ...keys]))
        : prev.permissions.filter((p) => !keys.includes(p)),
    }));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      permissions: form.permissions,
    };
    try {
      if (editing === 'new') {
        await api<RoleSummary>('/roles', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (editing) {
        await api<RoleSummary>(`/roles/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSaving(true);
    setFormError(null);
    try {
      await api<void>(`/roles/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch (err) {
      setFormError(resolveError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gold">
            {t('eyebrow')}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            {t('title')}
          </h1>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} aria-hidden /> {t('new')}
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-ink-soft">{tCommon('states.loading')}</p>
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : !roles || roles.length === 0 ? (
          <EmptyState
            title={t('empty.title')}
            hint={t('empty.hint')}
            action={<Button onClick={openCreate}>{t('new')}</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-line bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display font-semibold text-ink">
                        {role.name}
                      </p>
                      {role.isSystem && (
                        <Badge tone="gold">
                          <Lock size={11} className="me-1" aria-hidden />
                          {t('card.system')}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                      <Users size={13} aria-hidden />
                      {t('card.adminsCount', { count: role.adminsCount })}
                    </p>
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(role)}
                        aria-label={t('card.editAria', { name: role.name })}
                        className="rounded p-1.5 text-ink-soft hover:text-ink"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => {
                          setFormError(null);
                          setDeleting(role);
                        }}
                        aria-label={t('card.deleteAria', { name: role.name })}
                        className="rounded p-1.5 text-ink-soft hover:text-danger"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {role.description && (
                  <p className="mt-3 text-sm text-ink-soft">{role.description}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {role.permissions.includes('*') ? (
                    <Badge tone="gold">{t('card.fullAccess')}</Badge>
                  ) : role.permissions.length === 0 ? (
                    <Badge tone="warning">{t('card.noPermissions')}</Badge>
                  ) : (
                    role.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs text-ink-soft"
                      >
                        <Code>{p}</Code>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / edit modal with the permission matrix */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('form.createTitle') : t('form.editTitle')}
        wide
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
            label={t('form.name')}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Field
            label={t('form.description')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-ink">
              {t('form.permissions')}
            </legend>
            {form.permissions.length === 0 && (
              <p className="mb-3 text-xs text-amber-700">
                {t('form.noPermissionsWarning')}
              </p>
            )}
            <div className="space-y-4">
              {Object.entries(catalog).map(([module, keys]) => {
                const allSelected = keys.every((k) =>
                  form.permissions.includes(k),
                );
                return (
                  <div
                    key={module}
                    className="rounded-lg border border-line p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-ink">
                        {moduleLabel(module)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setModule(keys, !allSelected)}
                        className="text-xs text-gold underline-offset-2 hover:underline"
                      >
                        {allSelected
                          ? t('form.clearAll')
                          : t('form.selectAll')}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {keys.map((key) => {
                        const selected = form.permissions.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => togglePermission(key)}
                            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                              selected
                                ? 'border-gold/60 bg-gold-soft text-ink'
                                : 'border-line bg-white text-ink-soft hover:border-gold/40'
                            }`}
                          >
                            <span>{permissionLabel(key)}</span>
                            <Code className="opacity-70">{key}</Code>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(null)}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" loading={saving}>
              {editing === 'new'
                ? t('form.createSubmit')
                : t('form.saveSubmit')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={t('delete.title')}
      >
        {formError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {formError}
          </div>
        )}
        {deleting && (
          <p className="text-sm text-ink-soft">
            {t.rich('delete.body', {
              name: deleting.name,
              strong: (chunks) => (
                <strong className="text-ink">{chunks}</strong>
              ),
            })}
            {deleting.adminsCount > 0 && (
              <>
                {' '}
                {t('delete.assigned', { count: deleting.adminsCount })}
              </>
            )}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(null)}>
            {tCommon('actions.cancel')}
          </Button>
          <Button variant="danger" loading={saving} onClick={handleDelete}>
            {t('delete.confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
