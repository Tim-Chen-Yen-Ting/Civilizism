import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './PageShell.module.css';

interface PageShellProps {
  children: ReactNode;
}

/**
 * Top-level page frame: header with a home link, plus a centered content
 * column. Every route renders inside this.
 */
export function PageShell({ children }: PageShellProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          Civilizism
        </Link>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
