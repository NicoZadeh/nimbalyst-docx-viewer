import { useEffect, useRef, useState } from 'react';
import { MaterialSymbol } from '@nimbalyst/extension-sdk';

export interface MenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}

/** A "..." button that opens a dropdown of secondary actions. Closes on outside click / Escape. */
export function OverflowMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="nim-docx-more" ref={ref}>
      <button
        type="button"
        className={open ? 'nim-docx-btn nim-docx-icon is-active' : 'nim-docx-btn nim-docx-icon'}
        onClick={() => setOpen((o) => !o)}
        title="More actions"
        aria-label="More actions"
        aria-expanded={open}
      >
        <MaterialSymbol icon="more_horiz" size={18} />
      </button>
      {open && (
        <div className="nim-docx-menu" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={item.active ? 'nim-docx-menu-item is-active' : 'nim-docx-menu-item'}
              disabled={item.disabled}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              <MaterialSymbol icon={item.icon} size={16} />
              <span className="nim-docx-menu-label">{item.label}</span>
              {item.active && <MaterialSymbol icon="check" size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
