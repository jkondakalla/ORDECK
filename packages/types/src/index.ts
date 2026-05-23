/* Shared types for the ORDECK monorepo.
   All apps and widgets import from @hub/types. */

export interface WidgetManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: string;
  color?: string;
  remoteUrl: string;
  port: number;
  launch?: {
    type: 'iframe' | 'tab' | 'embedded';
    target?: string;
  };
}

export interface WidgetStatus {
  online: boolean;
  label?: string;
  detail?: string;
  lastChecked?: string;
}

export interface WidgetInstance {
  id: number;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WidgetType =
  | 'clock'
  | 'plugins'
  | 'connections'
  | 'log'
  | 'plex'
  | 'lazuros'
  | 'beigeboard'
  | 'recipe';

export interface HubUser {
  name: string;
  sessionId: string;
}

export interface WidgetProps {
  widgetId: number;
}

export interface Item {
  id: number;
  kind: 'task' | 'goal' | 'event';
  scope: 'year' | 'month' | 'week' | 'day' | 'subtask';
  title: string;
  notes?: string;
  parent_id?: number;
  accent?: string;
  source: 'bb' | 'google' | 'outlook' | 'icloud';
  completed: boolean;
  year?: string;
  month?: string;
  week_start?: string;
  due_date?: string;
  scheduled_time?: string;
  scheduled_end?: string;
  end_date?: string;
  location?: string;
  attendees?: number;
  target?: string;
  created_at?: string;
}

export interface CalendarAccount {
  id: 'google' | 'outlook' | 'icloud' | 'bb';
  connected: boolean;
  email: string;
  visible: boolean;
  kind: string;
}
