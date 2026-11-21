import { useNavigate } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { PanelButton } from '../components/ui/Panel';
import styles from './Home.module.css';

export function Home() {
  const navigate = useNavigate();

  return (
    <PageShell>
      <div className={styles.intro}>
        <h1 className={styles.title}>Civilizism</h1>
        <p className={styles.subtitle}>Agent-based social simulation — watch a recorded run play out tick by tick.</p>
      </div>

      <div className={styles.choices}>
        <PanelButton onClick={() => navigate('/viewer')}>
          <div className={styles.choiceIcon}>▶</div>
          <div className={styles.choiceTitle}>Watch the housemates replay</div>
          <p className={styles.choiceDesc}>Four housemates over a day and a half — movement, speech, moods and relationships as they unfold.</p>
        </PanelButton>
      </div>
    </PageShell>
  );
}
