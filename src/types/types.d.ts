export interface GameExecutable {
  is_launcher: boolean;
  name: string;
  os: string;
}

export interface Game {
    uid?: string;
    id: string;
    name: string;
    executables: GameExecutable[];
    aliases?: string[];
    themes?: string[];
    icon_hash?: string | null;
}
