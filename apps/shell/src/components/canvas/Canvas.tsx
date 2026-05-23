import { CSSProperties, ComponentType } from 'react';
import { WidgetInstance } from '@hub/types';
import Widget from './Widget';
import ClockWidget from '../../widgets/ClockWidget';
import PluginsWidget from '../../widgets/PluginsWidget';
import ConnectionsWidget from '../../widgets/ConnectionsWidget';
import LogWidget from '../../widgets/LogWidget';
import RemoteWidget from '../../widgets/RemoteWidget';

interface WidgetMeta {
  title: string;
  code: string;
  component: ComponentType<{ widgetId: number }> | null;
  remote?: boolean;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  clock:       { title: 'CHRONO://01',      code: 'MOD-001', component: ClockWidget },
  plugins:     { title: 'PLUGIN://GRID',    code: 'MOD-002', component: PluginsWidget },
  connections: { title: 'CONN://STATUS',    code: 'MOD-003', component: ConnectionsWidget },
  log:         { title: 'OP://LOG',         code: 'MOD-004', component: LogWidget },
  plex:        { title: 'PLEX://MEDIA',     code: 'RMT-001', component: null, remote: true },
  lazuros:     { title: 'LAZUROS://COMPUTE',code: 'RMT-002', component: null, remote: true },
  beigeboard:  { title: 'BEIGEBOARD://FIN', code: 'RMT-003', component: null, remote: true },
  recipe:      { title: 'RECIPE://MGMT',    code: 'RMT-004', component: null, remote: true },
};

export { WIDGET_META };

interface CanvasProps {
  widgets: WidgetInstance[];
  onUpdateWidget: (id: number, patch: Partial<WidgetInstance>) => void;
  onCloseWidget: (id: number) => void;
}

export default function Canvas({ widgets, onUpdateWidget, onCloseWidget }: CanvasProps) {
  return (
    <main style={{
      flex: 1,
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: 'var(--hub-bg-0)',
      backgroundImage: `
        linear-gradient(rgba(255,176,0,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,176,0,0.03) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
    }}>
      <CanvasMarks />

      {widgets.map(w => {
        const meta = WIDGET_META[w.type];
        if (!meta) return null;

        return (
          <Widget
            key={w.id}
            data={w}
            title={meta.title}
            code={meta.code}
            isRemote={!!meta.remote}
            onUpdate={patch => onUpdateWidget(w.id, patch)}
            onClose={() => onCloseWidget(w.id)}
          >
            {meta.remote
              ? <RemoteWidget type={w.type} />
              : meta.component && <meta.component widgetId={w.id} />
            }
          </Widget>
        );
      })}
    </main>
  );
}

function CanvasMarks() {
  const corner = (style: CSSProperties) => (
    <div style={{
      position: 'absolute', width: 14, height: 14,
      borderColor: 'var(--hub-amber-dim)', borderStyle: 'solid',
      ...style,
    }} />
  );
  return (
    <div style={{ position: 'absolute', inset: 8, pointerEvents: 'none', zIndex: 1 }}>
      {corner({ top: 0, left: 0, borderWidth: '1.5px 0 0 1.5px' })}
      {corner({ top: 0, right: 0, borderWidth: '1.5px 1.5px 0 0' })}
      {corner({ bottom: 0, left: 0, borderWidth: '0 0 1.5px 1.5px' })}
      {corner({ bottom: 0, right: 0, borderWidth: '0 1.5px 1.5px 0' })}
    </div>
  );
}
