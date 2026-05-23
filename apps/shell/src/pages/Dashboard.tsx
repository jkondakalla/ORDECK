import { useState, useCallback, useEffect } from 'react';
import { WidgetInstance, WidgetType } from '@hub/types';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';
import Canvas from '../components/canvas/Canvas';

const STORAGE_KEY = 'ordeck-layout-v1';

interface LayoutState {
  widgets: WidgetInstance[];
  nextId: number;
}

const DEFAULT_LAYOUT: WidgetInstance[] = [
  { id: 1, type: 'clock',       x: 1,  y: 1, w: 6,  h: 5 },
  { id: 2, type: 'plugins',     x: 8,  y: 1, w: 10, h: 7 },
  { id: 3, type: 'connections', x: 1,  y: 7, w: 7,  h: 7 },
  { id: 4, type: 'log',         x: 19, y: 1, w: 8,  h: 6 },
];

const WIDGET_DEFAULTS: Record<string, { w: number; h: number }> = {
  clock:       { w: 6,  h: 5 },
  plugins:     { w: 10, h: 7 },
  connections: { w: 7,  h: 7 },
  log:         { w: 8,  h: 6 },
  plex:        { w: 10, h: 8 },
  lazuros:     { w: 10, h: 8 },
  beigeboard:  { w: 10, h: 8 },
  recipe:      { w: 9,  h: 8 },
};

function loadLayout(): LayoutState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LayoutState;
  } catch { /* ignore */ }
  return null;
}

function saveLayout(state: LayoutState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function Dashboard() {
  const [state, setState] = useState<LayoutState>(() => {
    const saved = loadLayout();
    return saved ?? { widgets: DEFAULT_LAYOUT, nextId: DEFAULT_LAYOUT.length + 1 };
  });

  useEffect(() => {
    saveLayout(state);
  }, [state]);

  const updateWidget = useCallback((id: number, patch: Partial<WidgetInstance>) => {
    setState(s => ({
      ...s,
      widgets: s.widgets.map(w => w.id === id ? { ...w, ...patch } : w),
    }));
  }, []);

  const closeWidget = useCallback((id: number) => {
    setState(s => ({ ...s, widgets: s.widgets.filter(w => w.id !== id) }));
  }, []);

  const addWidget = useCallback((type: WidgetType) => {
    setState(s => {
      const defaults = WIDGET_DEFAULTS[type] ?? { w: 8, h: 6 };
      const offset = s.widgets.length % 5;
      const newWidget: WidgetInstance = {
        id: s.nextId,
        type,
        x: 1 + offset * 2,
        y: 1 + offset * 2,
        ...defaults,
      };
      return { widgets: [...s.widgets, newWidget], nextId: s.nextId + 1 };
    });
  }, []);

  const resetLayout = useCallback(() => {
    if (confirm('Reset surface to default layout?')) {
      setState({ widgets: DEFAULT_LAYOUT, nextId: DEFAULT_LAYOUT.length + 1 });
    }
  }, []);

  const clearAll = useCallback(() => {
    if (confirm('Clear all widgets from surface?')) {
      setState(s => ({ ...s, widgets: [] }));
    }
  }, []);

  return (
    <>
      <Header pluginCount={state.widgets.length} />

      <div style={{
        position: 'fixed',
        top: 'var(--hub-header-h)',
        left: 0, right: 0,
        bottom: '28px',
        display: 'flex',
      }}>
        <Sidebar
          onAddWidget={addWidget}
          onResetLayout={resetLayout}
          onClearAll={clearAll}
        />
        <Canvas
          widgets={state.widgets}
          onUpdateWidget={updateWidget}
          onCloseWidget={closeWidget}
        />
      </div>

      <Footer widgetCount={state.widgets.length} />
    </>
  );
}
