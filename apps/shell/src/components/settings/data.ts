import type { Settings } from './types';

export const SETTINGS_KEY = 'ordeck-settings-v1';

export const PHOSPHOR_GROUPS = [
  { title: 'CASSETTE · CLASSIC', items: [
    { id: 'amber',      label: 'AMBER',      swatch: '#ffb000' },
    { id: 'green',      label: 'GREEN VT',   swatch: '#5cd66a' },
    { id: 'cyan',       label: 'CYAN',       swatch: '#4ecdc4' },
    { id: 'paperwhite', label: 'PAPERWHITE', swatch: '#f0e8d0' },
    { id: 'vt220',      label: 'VT220',      swatch: '#ff9c2a' },
    { id: 'p1',         label: 'P1 GREEN',   swatch: '#65ff3e' },
    { id: 'plasma',     label: 'PLASMA',     swatch: '#ff7a14' },
    { id: 'commodore',  label: 'C-64',       swatch: '#a1a1ff' },
    { id: 'ibm-gold',   label: 'IBM GOLD',   swatch: '#f4c14e' },
    { id: 'redshift',   label: 'REDSHIFT',   swatch: '#ff7a3a' },
  ]},
  { title: 'NEON', items: [
    { id: 'hotpink',  label: 'HOT PINK',   swatch: '#ff3aa1' },
    { id: 'acid',     label: 'ACID GREEN', swatch: '#c5ff14' },
    { id: 'magenta',  label: 'MAGENTA',    swatch: '#ff2bd6' },
    { id: 'electric', label: 'ELECTRIC',   swatch: '#2eb3ff' },
    { id: 'lime',     label: 'LIME',       swatch: '#aeff1e' },
    { id: 'mint',     label: 'MINT',       swatch: '#5affc1' },
    { id: 'aqua',     label: 'AQUA',       swatch: '#2efff2' },
    { id: 'violet',   label: 'VIOLET',     swatch: '#c08aff' },
  ]},
  { title: 'MODERN', items: [
    { id: 'ice',     label: 'ICE BLUE', swatch: '#a8d8ff' },
    { id: 'rose',    label: 'ROSE',     swatch: '#ff7a9a' },
    { id: 'solar',   label: 'SOLAR',    swatch: '#ffd000' },
    { id: 'coral',   label: 'CORAL',    swatch: '#ff6b5a' },
    { id: 'crimson', label: 'CRIMSON',  swatch: '#ff3a4e' },
    { id: 'pearl',   label: 'PEARL',    swatch: '#d8d4e8' },
    { id: 'royal',   label: 'ROYAL',    swatch: '#8a6bff' },
    { id: 'sunset',  label: 'SUNSET',   swatch: '#ff944a' },
  ]},
  { title: 'METALLURGICAL', items: [
    { id: 'mercury', label: 'MERCURY', swatch: '#c8cbd0' },
    { id: 'tritium', label: 'TRITIUM', swatch: '#9affcb' },
    { id: 'carbon',  label: 'CARBON',  swatch: '#a8a8a8' },
  ]},
];

export const STYLES = [
  { id: 'cassette',  label: 'CASSETTE',  desc: 'WARM HARDWARE · SCREWS · TAPE',  swatch: '#ffb000', accent: '#2c2820' },
  { id: 'terminal',  label: 'TERMINAL',  desc: 'ASCII · VT323 · NO CHROME',       swatch: '#5cd66a', accent: '#050505' },
  { id: 'cyberdeck', label: 'CYBERDECK', desc: 'NOTCHED · NEON GLOW · ORBITRON',  swatch: '#2eb3ff', accent: '#15142a' },
  { id: 'hologram',  label: 'HOLOGRAM',  desc: 'FROSTED GLASS · ROUNDED · INTER', swatch: '#a8d8ff', accent: '#0f1428' },
] as const;

export const SHELLS = [
  { id: 'warm',  label: 'WARM TAN',    swatch: '#2c2820' },
  { id: 'deep',  label: 'DEEP WALNUT', swatch: '#1d1812' },
  { id: 'olive', label: 'OLIVE DRAB',  swatch: '#22241a' },
  { id: 'ash',   label: 'ASH GREY',    swatch: '#252321' },
  { id: 'cool',  label: 'COOL SLATE',  swatch: '#1f2330' },
] as const;

export const DEFAULT_SETTINGS: Settings = {
  phosphor: 'amber',
  style: 'cassette',
  shell: 'warm',
  scanlines: 0.012,
  vignette: 0.45,
  gridDensity: 1,
  boldGlow: false,
  showBus: true,
  showRail: true,
  showScrews: true,
};
