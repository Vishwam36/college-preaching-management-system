import { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';

/**
 * Generic searchable combobox with "add new" support.
 *
 * Props:
 *   options      — array of { id, name }
 *   value        — { id, label, isNew } | null  (controlled)
 *   onChange     — called with { id, label, isNew } on select, or null when typing
 *   placeholder  — string (default: "Search or type…")
 *   addLabel     — string template for "add new" row, use {query} as placeholder
 *                  e.g. 'Add "{query}" as new event type'
 *   emptyText    — text shown when options list is empty
 *   hasError     — boolean, adds error style to input
 */
export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = 'Search or type…',
  addLabel = 'Add "{query}"',
  emptyText = 'No options. Type to create one.',
  hasError = false,
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Restore query from label when parent value changes
  useEffect(() => {
    if (value?.label) {
      setQuery(value.label);
    }
  }, [value?.label, value?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = query.trim()
    ? options.filter(o => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const exactMatch = options.some(o => o.name.toLowerCase() === query.toLowerCase().trim());

  function select(option) {
    onChange({ id: option.id, label: option.name, isNew: false });
    setQuery(option.name);
    setOpen(false);
  }

  function selectNew() {
    onChange({ id: null, label: query.trim(), isNew: true });
    setOpen(false);
  }

  const addLabelText = addLabel.replace('{query}', query.trim());

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className={`form-input ${hasError ? 'form-input-error' : ''}`}
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxHeight: 220, overflowY: 'auto', marginTop: 4
        }}>
          {filtered.map(o => (
            <div key={o.id}
              onClick={() => select(o)}
              style={{
                padding: 'var(--space-2) var(--space-3)', cursor: 'pointer',
                fontSize: 'var(--font-sm)', color: 'var(--text-primary)',
                background: value?.id === o.id ? 'var(--accent-glow)' : 'transparent'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = value?.id === o.id ? 'var(--accent-glow)' : 'transparent'}
            >
              {o.name}
            </div>
          ))}

          {query.trim() && !exactMatch && (
            <div onClick={selectNew}
              style={{
                padding: 'var(--space-2) var(--space-3)', cursor: 'pointer',
                fontSize: 'var(--font-sm)', color: 'var(--text-accent)',
                borderTop: filtered.length ? '1px solid var(--border-primary)' : 'none',
                fontWeight: 600
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={12} style={{ marginRight: 4 }} />
              {addLabelText}
            </div>
          )}

          {filtered.length === 0 && !query.trim() && (
            <div style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
              {emptyText}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
