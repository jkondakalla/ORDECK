import { ReactNode, useRef, useCallback } from 'react';
import { WidgetInstance } from '@hub/types';

const GRID = 40;
const MIN_W = 200;
const MIN_H = 120;

type PointerLike = MouseEvent | TouchEvent;

function getPoint(e: PointerLike): { x: number; y: number } {
  if ('touches' in e && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if ('changedTouches' in e && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  const m = e as MouseEvent;
  return { x: m.clientX, y: m.clientY };
}

interface WidgetFrameProps {
  data: WidgetInstance;
  title: string;
  code: string;
  isRemote?: boolean;
  onUpdate: (patch: Partial<WidgetInstance>) => void;
  onClose: () => void;
  children?: ReactNode;
}

export default function Widget({ data, title, code, onUpdate, onClose, children }: WidgetFrameProps) {
  const elRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as Element).closest('[data-close]')) return;
    const el = elRef.current;
    if (!el) return;
    const canvas = el.parentElement!;
    const pt0 = getPoint(e.nativeEvent as PointerLike);
    const startLeft = parseFloat(el.style.left);
    const startTop = parseFloat(el.style.top);

    el.style.zIndex = '50';
    el.style.boxShadow = '0 0 0 1px var(--hub-amber), 0 8px 32px rgba(0,0,0,0.5)';
    el.style.transition = 'none';

    const onMove = (ev: PointerLike) => {
      const pt = getPoint(ev);
      const maxL = canvas.clientWidth - el.offsetWidth;
      const maxT = canvas.clientHeight - el.offsetHeight;
      el.style.left = Math.max(0, Math.min(maxL, startLeft + pt.x - pt0.x)) + 'px';
      el.style.top = Math.max(0, Math.min(maxT, startTop + pt.y - pt0.y)) + 'px';
      if ((ev as TouchEvent).cancelable) ev.preventDefault();
    };

    const onEnd = () => {
      const sx = Math.round(parseFloat(el.style.left) / GRID);
      const sy = Math.round(parseFloat(el.style.top) / GRID);
      el.style.left = sx * GRID + 'px';
      el.style.top = sy * GRID + 'px';
      el.style.zIndex = '2';
      el.style.boxShadow = '';
      el.style.transition = '';
      onUpdate({ x: sx, y: sy });
      document.removeEventListener('mousemove', onMove as EventListener);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove as EventListener);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove as EventListener);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove as EventListener, { passive: false });
    document.addEventListener('touchend', onEnd);
    if ((e as React.TouchEvent).touches) e.preventDefault();
  }, [onUpdate]);

  const handleResizeStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const el = elRef.current;
    if (!el) return;
    const canvas = el.parentElement!;
    const pt0 = getPoint(e.nativeEvent as PointerLike);
    const startW = el.offsetWidth;
    const startH = el.offsetHeight;

    el.style.zIndex = '50';
    el.style.transition = 'none';

    const onMove = (ev: PointerLike) => {
      const pt = getPoint(ev);
      const left = parseFloat(el.style.left);
      const top = parseFloat(el.style.top);
      const nw = Math.max(MIN_W, Math.min(canvas.clientWidth - left, startW + pt.x - pt0.x));
      const nh = Math.max(MIN_H, Math.min(canvas.clientHeight - top, startH + pt.y - pt0.y));
      el.style.width = nw + 'px';
      el.style.height = nh + 'px';
      if ((ev as TouchEvent).cancelable) ev.preventDefault();
    };

    const onEnd = () => {
      const sw = Math.max(5, Math.round(parseFloat(el.style.width) / GRID));
      const sh = Math.max(3, Math.round(parseFloat(el.style.height) / GRID));
      el.style.width = sw * GRID + 'px';
      el.style.height = sh * GRID + 'px';
      el.style.zIndex = '2';
      el.style.transition = '';
      onUpdate({ w: sw, h: sh });
      document.removeEventListener('mousemove', onMove as EventListener);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove as EventListener);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMove as EventListener);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove as EventListener, { passive: false });
    document.addEventListener('touchend', onEnd);
    if ((e as React.TouchEvent).touches) e.preventDefault();
  }, [onUpdate]);

  return (
    <div
      ref={elRef}
      style={{
        position: 'absolute',
        left: data.x * GRID,
        top: data.y * GRID,
        width: data.w * GRID,
        height: data.h * GRID,
        background: 'var(--hub-bg-1)',
        border: '1px solid var(--hub-line-strong)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 2,
        transition: 'box-shadow 0.15s ease',
        minWidth: MIN_W,
        minHeight: MIN_H,
      }}
      onMouseEnter={e => { if (!e.currentTarget.style.boxShadow) e.currentTarget.style.boxShadow = '0 0 0 1px var(--hub-amber-dim)'; }}
      onMouseLeave={e => { if (e.currentTarget.style.zIndex !== '50') e.currentTarget.style.boxShadow = ''; }}
    >
      <div
        style={{
          height: 32,
          background: 'linear-gradient(180deg, var(--hub-bg-2), var(--hub-bg-1))',
          borderBottom: '1px solid var(--hub-line)',
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8,
          cursor: 'grab', flexShrink: 0,
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <span className="led amber" />
        <span style={{
          flex: 1,
          fontSize: 10, letterSpacing: '0.12em',
          color: 'var(--hub-amber)', fontWeight: 500,
          textShadow: '0 0 4px var(--hub-amber-glow)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
        <span style={{ fontSize: 9, color: 'var(--hub-cream-dim)', letterSpacing: '0.1em' }}>
          {code}.{String(data.id).padStart(3, '0')}
        </span>
        <button
          data-close
          onClick={onClose}
          style={{
            width: 18, height: 18,
            border: '1px solid var(--hub-line-strong)',
            background: 'transparent',
            color: 'var(--hub-cream-dim)',
            display: 'grid', placeItems: 'center',
            fontSize: 12, lineHeight: 1, padding: 0,
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--hub-red)'; e.currentTarget.style.color = 'var(--hub-red)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hub-line-strong)'; e.currentTarget.style.color = 'var(--hub-cream-dim)'; }}
        >×</button>
      </div>

      <div style={{
        flex: 1, overflow: 'auto',
        padding: 12, fontSize: 11,
        lineHeight: 1.5, color: 'var(--hub-cream)',
        position: 'relative',
      }}>
        {children}
      </div>

      <div
        style={{
          position: 'absolute', right: 0, bottom: 0,
          width: 18, height: 18,
          cursor: 'nwse-resize', zIndex: 5,
          touchAction: 'none',
        }}
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <div style={{
          position: 'absolute', right: 3, bottom: 3,
          width: 10, height: 10,
          borderRight: '2px solid var(--hub-amber-dim)',
          borderBottom: '2px solid var(--hub-amber-dim)',
        }} />
      </div>
    </div>
  );
}
