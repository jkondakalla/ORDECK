import { CSSProperties, ButtonHTMLAttributes, useState } from 'react';

type Variant = 'primary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  label?: string;
}

const BASE: CSSProperties = {
  fontFamily: 'var(--hub-font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  padding: '8px 16px',
  border: '1px solid',
  cursor: 'pointer',
  transition: 'all 0.12s ease',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  WebkitTapHighlightColor: 'transparent',
};

const VARIANTS: Record<Variant, { idle: CSSProperties; hover: CSSProperties }> = {
  primary: {
    idle: {
      background: 'var(--hub-bg-2)',
      borderColor: 'var(--hub-amber-dim)',
      color: 'var(--hub-amber)',
    },
    hover: {
      background: 'var(--hub-amber)',
      borderColor: 'var(--hub-amber)',
      color: 'var(--hub-bg-0)',
      boxShadow: '0 0 12px var(--hub-amber-glow)',
    },
  },
  ghost: {
    idle: {
      background: 'transparent',
      borderColor: 'var(--hub-line)',
      color: 'var(--hub-cream)',
    },
    hover: {
      background: 'var(--hub-bg-3)',
      borderColor: 'var(--hub-amber-dim)',
      color: 'var(--hub-amber)',
    },
  },
  danger: {
    idle: {
      background: 'transparent',
      borderColor: 'var(--hub-line)',
      color: 'var(--hub-cream-dim)',
    },
    hover: {
      background: 'transparent',
      borderColor: 'var(--hub-red)',
      color: 'var(--hub-red)',
    },
  },
};

export default function Button({ variant = 'ghost', children, style, ...props }: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const v = VARIANTS[variant];
  return (
    <button
      {...props}
      style={{ ...BASE, ...(hovered ? v.hover : v.idle), ...style }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  );
}
