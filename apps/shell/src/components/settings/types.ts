export interface Settings {
  phosphor: string;
  style: 'cassette' | 'terminal' | 'cyberdeck' | 'hologram';
  shell: 'warm' | 'deep' | 'olive' | 'ash' | 'cool';
  scanlines: number;
  vignette: number;
  gridDensity: number;
  boldGlow: boolean;
  showBus: boolean;
  showRail: boolean;
  showScrews: boolean;
}
