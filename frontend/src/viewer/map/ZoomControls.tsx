import type { PointerEvent as ReactPointerEvent } from 'react';
import styles from './ZoomControls.module.css';

interface ZoomControlsProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/** Top-left zoom/reset affordance, shared by MapCanvas (viewer) and RoomCanvas
 *  (builder). Both host canvases start their own primary left-drag gesture
 *  (pan, marquee-select) on any pointerdown that bubbles to their viewport —
 *  so a pointerdown that lands on one of THIS widget's buttons has to stop
 *  there, or the host canvas's setPointerCapture swallows the button's own
 *  click. That guard has to sit on the buttons themselves, not the wrapping
 *  div: RoomCanvas's primary gesture is marquee-select, and a div-wide guard
 *  would silently kill marquee drags starting anywhere over this widget's
 *  non-interactive area (gaps, the readout) too, not just its buttons. */
export function ZoomControls({ scale, onZoomIn, onZoomOut, onReset }: ZoomControlsProps) {
  function stopPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <div className={styles.controls}>
      <button type="button" className={styles.button} onPointerDown={stopPointerDown} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        +
      </button>
      <div className={styles.readout}>{Math.round(scale * 100)}%</div>
      <button type="button" className={styles.button} onPointerDown={stopPointerDown} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        −
      </button>
      <button type="button" className={styles.button} onPointerDown={stopPointerDown} onClick={onReset} aria-label="Reset view" title="Reset view">
        ⤾
      </button>
    </div>
  );
}
