import { useEffect, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '../components/layout/PageShell';
import { Panel } from '../components/ui/Panel';
import type { RunFile } from '../types/run';
import { RunDataProvider, useRunData } from '../viewer/state/RunDataContext';
import { PlaybackProvider } from '../viewer/state/PlaybackContext';
import { ClockFace } from '../viewer/clock/ClockFace';
import { GlobalMenu } from '../viewer/menu/GlobalMenu';
import { PlaybackBar } from '../viewer/playback/PlaybackBar';
import { SpeechLog } from '../viewer/playback/SpeechLog';
import { MapCanvas } from '../viewer/map/MapCanvas';
import { AgentPanel } from '../viewer/panel/AgentPanel';
import { Scoreboard } from '../viewer/scoreboard/Scoreboard';
import placeholderStyles from './Placeholder.module.css';
import styles from './Viewer.module.css';

/**
 * Loose runtime shape check — not a full schema validator. Same fields the
 * scaffold's placeholder checked, kept here so a malformed or unrelated JSON
 * file fails with a clear message before any viewer state is built from it.
 */
function checkRunFileShape(data: unknown): RunFile {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Not a JSON object.');
  }
  const run = data as Partial<RunFile>;
  const required: [keyof RunFile, string][] = [
    ['scenario_name', 'string'],
    ['schema_version', 'number'],
    ['first_tick', 'number'],
    ['last_tick', 'number'],
    ['tick_count', 'number'],
  ];
  for (const [key, type] of required) {
    if (typeof run[key] !== type) {
      throw new Error(`Missing or wrong-typed field "${key}" — this doesn't look like a run JSON.`);
    }
  }
  if (typeof run.agents !== 'object' || run.agents === null) {
    throw new Error('Missing "agents" field — this doesn\'t look like a run JSON.');
  }
  if (!Array.isArray(run.activity_log)) {
    throw new Error('Missing "activity_log" field — this doesn\'t look like a run JSON.');
  }
  if (typeof run.resume !== 'object' || run.resume === null || typeof run.resume.density !== 'number') {
    throw new Error('Missing "resume.density" field — this doesn\'t look like a run JSON.');
  }
  return run as RunFile;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; fileName: string; run: RunFile };

const REPLAY_FILE = 'housemates_replay.json';

async function fetchReplay(): Promise<RunFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}${REPLAY_FILE}`);
  if (!res.ok) throw new Error(`Could not load ${REPLAY_FILE} (${res.status}).`);
  return checkRunFileShape(await res.json());
}

export function Viewer() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    fetchReplay()
      .then((run) => setState({ status: 'loaded', fileName: REPLAY_FILE, run }))
      .catch((err) => setState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load the replay.' }));
  }, []);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const run = checkRunFileShape(JSON.parse(await file.text()));
      setState({ status: 'loaded', fileName: file.name, run });
    } catch (err) {
      const message = err instanceof SyntaxError ? `Invalid JSON: ${err.message}` : err instanceof Error ? err.message : 'Failed to load file.';
      setState({ status: 'error', message });
    } finally {
      event.target.value = '';
    }
  }

  if (state.status !== 'loaded') {
    return (
      <PageShell>
        <div className={placeholderStyles.wrap}>
          <Link to="/" className={placeholderStyles.backLink}>
            ← Back to home
          </Link>
          <h1 className={placeholderStyles.title}>Simulation viewer</h1>
          <Panel>
            {state.status === 'loading' ? (
              <p className={placeholderStyles.desc}>Loading the replay…</p>
            ) : (
              <>
                <p className={styles.errorHeading}>Something went wrong</p>
                <p className={styles.error}>{state.message}</p>
                <p className={placeholderStyles.desc}>Or load a run JSON from your own machine.</p>
                <div className={styles.picker}>
                  <input type="file" accept=".json,application/json" onChange={handleFileChange} className={styles.fileInput} />
                </div>
              </>
            )}
          </Panel>
        </div>
      </PageShell>
    );
  }

  return (
    <RunDataProvider run={state.run} runKey={state.fileName}>
      <PlaybackProvider>
        <ViewerLayout fileName={state.fileName} />
      </PlaybackProvider>
    </RunDataProvider>
  );
}

function ViewerLayout({ fileName }: { fileName: string }) {
  const { run } = useRunData();

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <GlobalMenu run={run} />
          <div className={styles.runMeta}>
            <span className={styles.scenarioName}>{run.scenario_name}</span>
            <span className={styles.fileName}>{fileName}</span>
          </div>
        </div>
        <div className={styles.topBarRight}>
          <ClockFace />
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.mapRegion}>
          <MapCanvas />
          <Scoreboard />
        </div>
        <AgentPanel />
      </div>

      <footer className={styles.footer}>
        <SpeechLog />
        <PlaybackBar />
      </footer>
    </div>
  );
}
