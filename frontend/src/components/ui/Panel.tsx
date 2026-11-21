import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import styles from './Panel.module.css';

type PanelProps = HTMLAttributes<HTMLDivElement>;

/** Static card surface — a container, not clickable. */
export function Panel({ className, ...rest }: PanelProps) {
  return <div className={[styles.panel, className].filter(Boolean).join(' ')} {...rest} />;
}

type PanelButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Clickable card surface, e.g. the two Home page choices. */
export function PanelButton({ className, ...rest }: PanelButtonProps) {
  return <button className={[styles.panel, styles.interactive, className].filter(Boolean).join(' ')} {...rest} />;
}
