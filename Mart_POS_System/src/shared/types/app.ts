/** Application metadata returned to the renderer via secure IPC. */
export interface AppInfo {
  name: string;
  version: string;
  platform: NodeJS.Platform;
  isPackaged: boolean;
  userDataPath: string;
}

export interface DBHealth {
  status: 'ok' | 'error';
  message: string;
}

/** Generic Result type for predictable service & IPC responses. */
export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

/** Navigation Item definition */
export interface NavItem {
  id: string;
  label: string;
  path: string;
  phase: number;
  iconName: string;
  description: string;
}

/** Navigation Section definition */
export interface NavSection {
  title: string;
  items: NavItem[];
}
