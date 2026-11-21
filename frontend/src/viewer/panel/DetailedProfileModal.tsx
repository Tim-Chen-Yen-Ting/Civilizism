import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './DetailedProfileModal.module.css';

const HEXACO_FACTORS: Record<string, string> = {
  'Honesty-Humility': 'Sincere, fair and modest rather than manipulative or entitled.',
  Emotionality: 'Prone to fear, worry and emotional attachment.',
  Extraversion: 'Socially confident, talkative and energetic.',
  Agreeableness: 'Forgiving, gentle, flexible and patient.',
  Conscientiousness: 'Organized, diligent, thorough and careful.',
  Openness: 'Curious, creative and open to unusual ideas.',
};

const VALUE_GROUPS: Record<string, string> = {
  'Openness to Change': 'Independence, novelty and pleasure.',
  'Self-Enhancement': 'Achievement and influence over others.',
  Conservation: 'Security, tradition, rules and modesty.',
  'Self-Transcendence': 'Care for others, fairness and nature.',
};

export interface BioProfile {
  physiological_sensitivity: number;
  fatigue_tolerance: number;
  hunger_tolerance: number;
}

export interface DetailedProfileModalProps {
  agentId: string;
  /** Personality factors and value groups at the tick the modal was opened from. */
  psycProfile: Record<string, number>;
  bioProfile: BioProfile | null;
  onClose: () => void;
}

export function DetailedProfileModal({ agentId, psycProfile, bioProfile, onClose }: DetailedProfileModalProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const factorEntries = pickKnown(psycProfile, HEXACO_FACTORS);
  const valueEntries = pickKnown(psycProfile, VALUE_GROUPS);

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Detailed profile for ${agentId}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>{agentId} — detailed profile</h3>
            <p className={styles.subtitle}>Personality profile</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close detailed profile">
            ×
          </button>
        </div>

        <div className={styles.body}>
          {bioProfile && (
            <div className={styles.section}>
              <h4 className={styles.sectionHeading}>Constitution</h4>
              <p className={styles.sectionCaption}>Physical make-up, independent of personality.</p>
              <div className={styles.bioGrid}>
                <BioTile label="Physiological sensitivity" value={bioProfile.physiological_sensitivity} />
                <BioTile label="Fatigue tolerance" value={bioProfile.fatigue_tolerance} />
                <BioTile label="Hunger tolerance" value={bioProfile.hunger_tolerance} />
              </div>
            </div>
          )}

          <TraitSection title="Personality factors" caption="How they tend to behave." entries={factorEntries} definitions={HEXACO_FACTORS} />
          <TraitSection title="Value groups" caption="What they care about." entries={valueEntries} definitions={VALUE_GROUPS} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function pickKnown(profile: Record<string, number>, known: Record<string, string>): [string, number][] {
  return Object.keys(known)
    .filter((key) => key in profile)
    .map((key): [string, number] => [key, profile[key]]);
}

function BioTile({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.bioTile}>
      <div className={styles.bioLabel}>{label}</div>
      <div className={styles.bioValue}>{value.toFixed(2)}</div>
    </div>
  );
}

function TraitSection({
  title,
  caption,
  entries,
  definitions,
}: {
  title: string;
  caption: string;
  entries: [string, number][];
  definitions: Record<string, string>;
}) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionHeading}>{title}</h4>
      <p className={styles.sectionCaption}>{caption}</p>
      <div className={styles.traitGrid}>
        {entries.map(([key, value]) => (
          <div key={key} className={styles.traitRow}>
            <div className={styles.traitLabelRow}>
              <span className={styles.traitLabel} title={definitions[key] ?? key}>
                {key}
              </span>
              <span className={styles.traitValue}>{value.toFixed(3)}</span>
            </div>
            <span className={styles.traitBarTrack}>
              <span className={styles.traitBarFill} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
