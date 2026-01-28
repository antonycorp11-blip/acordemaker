
export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6; // 1 = High E, 6 = Low E

export interface Position {
  string: StringNumber;
  fret: number;
}

export interface FingerPosition extends Position {
  id: string;
}

export interface ChordDefinition {
  name: string;
  positions: Position[];
  variations?: Position[][];
  unmutedStrings: StringNumber[]; // Strings that must be played
  description: string;
}

export enum GameLevel {
  MAJORS = 1,
  MINORS = 2,
  BARRE = 3
}

export interface LevelData {
  id: GameLevel;
  title: string;
  chords: string[];
  unlockThreshold: number;
  pointsPerChord: number;
}
