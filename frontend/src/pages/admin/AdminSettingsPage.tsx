import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { AppShell } from '../../components/AppShell';
import { adminApi } from '../../lib/admin';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Array<{ key: string; value: unknown }>>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const load = () => adminApi.listSettings().then((r) => setSettings(r.data.data.settings));

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!newKey) return;
    let parsed: unknown = newValue;
    try { parsed = JSON.parse(newValue); } catch { /* keep string */ }
    await adminApi.upsertSetting(newKey, parsed);
    toast.success('Setting saved');
    setNewKey('');
    setNewValue('');
    load();
  };

  return (
    <AppShell>
      <h1 className="text-3xl font-extrabold text-white">System Settings</h1>

      <div className="mt-6 space-y-3">
        {settings.map((s) => (
          <div key={s.key} className="rounded-xl border border-ink-500/60 bg-ink-700/40 p-4">
            <p className="font-mono text-sm text-brand">{s.key}</p>
            <pre className="mt-1 text-xs text-muted">{JSON.stringify(s.value)}</pre>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="setting.key"
          className="rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-white"
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder='value or {"json": true}'
          className="flex-1 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-white"
        />
        <button onClick={save} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Save
        </button>
      </div>
    </AppShell>
  );
}
