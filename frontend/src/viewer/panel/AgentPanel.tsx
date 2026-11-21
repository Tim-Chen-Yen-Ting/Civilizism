import { useRunData } from '../state/RunDataContext';
import { usePlayback } from '../state/PlaybackContext';
import { getAgentColor } from '../lib/agentColor';
import { OverviewTab } from './OverviewTab';
import { SocialTab } from './SocialTab';
import { TrendsTab } from './TrendsTab';
import styles from './AgentPanel.module.css';

const TABS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: 'Overview' },
  { value: 2, label: 'Social' },
  { value: 3, label: 'Trends' },
];

/** Slide-in shell from the right, mounted permanently in Viewer's .body so
 *  its CSS transform transition can animate open/close — unmounting it
 *  outright (panelAgentId === null) would skip the close animation. */
export function AgentPanel() {
  const { agentIds } = useRunData();
  const { panelAgentId, panelTab, setPanelTab, closePanel } = usePlayback();
  const open = panelAgentId !== null;
  const agentId = panelAgentId ?? '';

  return (
    <aside className={[styles.panel, open ? styles.open : ''].filter(Boolean).join(' ')} aria-hidden={!open}>
      {open && (
        <>
          <header className={styles.header}>
            <span className={styles.colorDot} style={{ background: getAgentColor(agentId, agentIds) }} />
            <h2 className={styles.title}>{agentId}</h2>
            <button type="button" className={styles.closeBtn} onClick={closePanel} aria-label="Close agent panel">
              ×
            </button>
          </header>

          <nav className={styles.tabBar} role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={panelTab === tab.value}
                className={[styles.tabBtn, panelTab === tab.value ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
                onClick={() => setPanelTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <div className={styles.tabContent}>
            {panelTab === 1 && <OverviewTab agentId={agentId} />}
            {panelTab === 2 && <SocialTab agentId={agentId} />}
            {panelTab === 3 && <TrendsTab agentId={agentId} />}
          </div>
        </>
      )}
    </aside>
  );
}
