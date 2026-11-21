import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { RunFile } from '../../types/run';
import { exportRunFile } from '../lib/exportRun';
import styles from './GlobalMenu.module.css';

interface GlobalMenuProps {
  run: RunFile;
}

/**
 * Hamburger menu: the one real item is exporting the currently-loaded run
 * back out as a file. Everything else (belief heatmap, other global
 * analysis views) is future work — represented here only as a disabled
 * stub, per the phase scope.
 */
export function GlobalMenu({ run }: GlobalMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleExport() {
    exportRunFile(run);
    setOpen(false);
  }

  function handleExit() {
    setOpen(false);
    navigate('/');
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.icon}>
          <span />
          <span />
          <span />
        </span>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <button type="button" className={styles.item} role="menuitem" onClick={handleExport}>
            Export run JSON
          </button>
          <div className={styles.divider} />
          <button type="button" className={styles.item} role="menuitem" disabled>
            More views
            <span className={styles.itemHint}>coming soon</span>
          </button>
          <div className={styles.divider} />
          <button type="button" className={styles.item} role="menuitem" onClick={handleExit}>
            Exit to home
          </button>
        </div>
      )}
    </div>
  );
}
