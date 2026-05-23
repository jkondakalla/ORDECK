/* Type declarations for Module Federation remote widgets.
   Each remote exposes a single default React component. */

declare module 'plex-widget/Widget' {
  import { ComponentType } from 'react';
  const Widget: ComponentType;
  export default Widget;
}

declare module 'lazuros-widget/Widget' {
  import { ComponentType } from 'react';
  const Widget: ComponentType;
  export default Widget;
}

declare module 'beigeboard-widget/Widget' {
  import { ComponentType } from 'react';
  const Widget: ComponentType;
  export default Widget;
}

declare module 'recipe-widget/Widget' {
  import { ComponentType } from 'react';
  const Widget: ComponentType;
  export default Widget;
}
