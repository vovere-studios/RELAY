import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../lib/theme';

export function AppearancePicker() {
  const { preference, setPreference } = useTheme();
  return <div className="appearance-picker" role="group" aria-label="Workspace appearance">
    {([{ id: 'light', label: 'Light', icon: Sun }, { id: 'dark', label: 'Dark', icon: Moon },
      { id: 'system', label: 'System', icon: Monitor }] as const).map(({ id, label, icon: Icon }) =>
      <button key={id} type="button" aria-pressed={preference === id} onClick={() => setPreference(id)} className="appearance-choice">
        <span className={`appearance-preview preview-${id}`} aria-hidden="true">
          <span className="appearance-preview-bar"><i/><i/><i/></span>
          <span className="appearance-preview-sidebar"><b/><i/><i/><i/></span>
          <span className="appearance-preview-content"><b/><span><i/><i/></span><em/><em/></span>
        </span>
        <span className="appearance-choice-caption"><Icon size={16} strokeWidth={1.65}/><strong>{label}</strong><span className="appearance-selection" aria-hidden="true"/></span>
        <small>{id === 'system' ? 'Follows your device' : `${label} appearance`}</small>
      </button>)}
  </div>;
}
