interface FooterProps {
  widgetCount?: number;
  message?: string;
}

export default function Footer({ widgetCount = 0, message = '▸ DRAG HEADERS // RESIZE FROM ⌐' }: FooterProps) {
  return (
    <footer style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      height: '28px',
      background: 'var(--hub-bg-2)',
      borderTop: '1px solid var(--hub-line-strong)',
      display: 'flex', alignItems: 'center',
      padding: '0 16px',
      gap: 16,
      fontSize: 10,
      color: 'var(--hub-cream-dim)',
      letterSpacing: '0.12em',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="led green" />
        SURFACE READY
      </div>
      <div>WIDGETS: {widgetCount}</div>
      <div style={{ marginLeft: 'auto' }}>{message}</div>
      <div>BUILD {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}</div>
    </footer>
  );
}
