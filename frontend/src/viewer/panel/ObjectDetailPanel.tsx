import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ObjectExport } from '../../types/run';
import { objectIcon } from '../lib/objectVisuals';
import styles from './ObjectDetailPanel.module.css';

export interface ObjectDetailPanelProps {
  object: ObjectExport;
  onClose: () => void;
}

/** "CookingApplianceObject" -> "Cooking Appliance". */
function humanizeKind(kind: string): string {
  const stripped = kind.endsWith('Object') ? kind.slice(0, -'Object'.length) : kind;
  return stripped.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function humanizeLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '(empty)';
  return String(value);
}

/**
 * Everything Room.export(grid)'s object_details carries, beyond
 * name/state/kind/description/world_position (rendered separately above the
 * grid) — varies by object type, so this just renders whichever of these
 * keys are actually present on this specific object rather than a fixed
 * per-type layout.
 */
const EXTRA_FIELDS: (keyof ObjectExport)[] = [
  'type',
  'holder',
  'open',
  'capacity',
  'contents',
  'freshness',
  'cooked',
  'charge',
  'pairs_with',
  'level',
  'peak',
  'uses',
  'maximum',
  'unit',
];

export function ObjectDetailPanel({ object, onClose }: ObjectDetailPanelProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const extras = EXTRA_FIELDS.filter((key) => object[key] !== undefined);

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={`Details for ${object.name}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>
              <span aria-hidden="true">{objectIcon(object.kind)}</span>
              {object.name}
            </h3>
            <p className={styles.subtitle}>{humanizeKind(object.kind)}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close object details">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.description}>{object.description}</p>

          <div className={styles.grid}>
            <div className={styles.tile}>
              <div className={styles.tileLabel}>State</div>
              <div className={styles.tileValue}>{object.state}</div>
            </div>
            <div className={styles.tile}>
              <div className={styles.tileLabel}>Position</div>
              <div className={styles.tileValue}>{object.world_position ? `(${object.world_position.x}, ${object.world_position.y})` : 'inside a closed container'}</div>
            </div>
            {extras.map((key) => (
              <div className={styles.tile} key={key}>
                <div className={styles.tileLabel}>{humanizeLabel(key)}</div>
                <div className={styles.tileValue}>{formatValue(object[key])}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
