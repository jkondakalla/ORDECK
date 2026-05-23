import { CSSProperties, ReactNode } from 'react';

type Status = 'active' | 'idle' | 'offline' | 'error' | 'neutral';

const STATUS_COLORS: Record<Status, string> = {
  active:  'var(--hub-green)',
  idle:    'var(--hub-amber)',
  offline: 'var(--hub-cream-dim)',
  error:   'var(--hub-red)',
  neutral: 'var(--hub-cyan)',
};

interface BadgeProps {
  status?: Status;
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Badge({ status = 'neutral', color, children, style }: BadgeProps) {
  const c = color ?? STATUS_COLORS[status];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 6px',
      border: `1px solid ${c}`,
      color: c,
      fontFamily: 'var(--hub-font-mono)',
      fontSize: 9,
      letterSpacing: '0.12em',
      ...style,
    }}>
      {children}
    </span>
  );
}
