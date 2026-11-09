import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { SOURCES } from '../hooks';
import type { SourceKey } from '../hooks';

interface Props {
  custom: Record<SourceKey, boolean>;
  replace: (key: SourceKey, text: string) => void;
  restore: (key: SourceKey) => void;
  error: string | null;
}

/** Replace any data source with a fresh CSV export of its sheet tab. */
export function DataPanel({ custom, replace, restore, error }: Props) {
  const [note, setNote] = useState<string | null>(null);

  const onFile = (key: SourceKey) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    const text = await file.text();
    replace(key, text);
    setNote(`${SOURCES[key].label} updated from ${file.name}.`);
  };

  return (
    <details className="sl-data" id="update-data" open={!!error}>
      <summary>Update data</summary>
      <p className="sl-cap">
        In Google Sheets, open the tab and choose File → Download → Comma-separated values (.csv), then pick the file below.
        Updated files are kept in this browser until you restore the bundled copy.
      </p>
      {error && <p className="sl-error" role="alert">{error} Restore the bundled copy or choose a CSV export of the right tab.</p>}
      {note && !error && <p className="sl-cap" role="status">{note}</p>}
      <div className="sl-data-grid">
        {(Object.keys(SOURCES) as SourceKey[]).map((k) => (
          <div key={k} className="sl-data-row">
            <div>
              <b>{SOURCES[k].label}</b>
              <span>{SOURCES[k].tab} tab · {custom[k] ? 'your uploaded file' : 'bundled copy'}</span>
            </div>
            <label className="sl-btn">
              Choose CSV
              <input type="file" accept=".csv,text/csv" onChange={onFile(k)} hidden />
            </label>
            {custom[k] && <button type="button" className="sl-btn" onClick={() => { restore(k); setNote(`${SOURCES[k].label} restored to the bundled copy.`); }}>Restore</button>}
          </div>
        ))}
      </div>
    </details>
  );
}
