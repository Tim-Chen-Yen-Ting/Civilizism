import type { RunFile } from '../../types/run';

function buildExportFilename(run: RunFile): string {
  const safeScenario = run.scenario_name.trim().replace(/[^a-zA-Z0-9_-]+/g, '_') || 'run';
  return `${safeScenario}_${run.first_tick}-${run.last_tick}.json`;
}

/**
 * Writes the in-memory run back out via the browser's own file-save
 * mechanism. This is a client-only replay viewer with no backend — export
 * just means round-tripping the loaded blob to a download, nothing more.
 */
export function exportRunFile(run: RunFile): void {
  const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildExportFilename(run);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
