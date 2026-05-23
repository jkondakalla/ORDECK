import { CSSProperties, ReactNode } from 'react';

interface CardProps {
  title?: string;
  accent?: string;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Card({ title, accent = 'var(--hub-amber)', children, style }: CardProps) {
  return (
    <div style={{
      background: 'var(--hub-bg-1)',
      border: '1px solid var(--hub-line-strong)',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}>
      {title && (
        <div style={{
          padding: '6px 12px',
          borderBottom: '1px solid var(--hub-line)',
          background: 'var(--hub-bg-2)',
          fontSize: 10,
          letterSpacing: '0.12em',
          color: accent,
          fontFamily: 'var(--hub-font-mono)',
          fontWeight: 500,
          textShadow: `0 0 4px ${accent}55`,
        }}>
          {title}
        </div>
      )}
      <div style={{ flex: 1, padding: 12, fontFamily: 'var(--hub-font-mono)', fontSize: 11 }}>
        {children}
      </div>
    </div>
  );
}
