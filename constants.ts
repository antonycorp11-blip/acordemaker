
import { ChordDefinition, GameLevel, LevelData, StringNumber } from './types';

export const STRINGS: StringNumber[] = [1, 2, 3, 4, 5, 6];
export const FRET_COUNT = 6;

export const CHORDS: Record<string, ChordDefinition> = {
  // --- NÍVEL 1: BÁSICOS (ABERTOS) ---
  'E': {
    name: 'Mi Maior (E)',
    description: 'Som cheio, usa todas as cordas.',
    positions: [{ string: 3, fret: 1 }, { string: 4, fret: 2 }, { string: 5, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'Em': {
    name: 'Mi Menor (Em)',
    description: 'Triste e profundo, apenas dois dedos.',
    positions: [{ string: 4, fret: 2 }, { string: 5, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'Am': {
    name: 'Lá Menor (Am)',
    description: 'Melancólico, não toque a corda 6.',
    positions: [{ string: 2, fret: 1 }, { string: 3, fret: 2 }, { string: 4, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'A': {
    name: 'Lá Maior (A)',
    description: 'Três dedos alinhados na casa 2.',
    positions: [{ string: 2, fret: 2 }, { string: 3, fret: 2 }, { string: 4, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'Asus2': {
    name: 'Lá com Segunda (Asus2)',
    description: 'Som moderno e aberto.',
    positions: [{ string: 3, fret: 2 }, { string: 4, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'D': {
    name: 'Ré Maior (D)',
    description: 'Formato de triângulo nas cordas agudas.',
    positions: [{ string: 1, fret: 2 }, { string: 2, fret: 3 }, { string: 3, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4]
  },
  'Dm': {
    name: 'Ré Menor (Dm)',
    description: 'Variação triste do Ré.',
    positions: [{ string: 1, fret: 1 }, { string: 2, fret: 3 }, { string: 3, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4]
  },
  'Dsus4': {
    name: 'Ré com Quarta (Dsus4)',
    description: 'Tensão que pede resolução.',
    positions: [{ string: 1, fret: 3 }, { string: 2, fret: 3 }, { string: 3, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4]
  },
  'C': {
    name: 'Dó Maior (C)',
    description: 'Fundamental e brilhante.',
    positions: [{ string: 2, fret: 1 }, { string: 4, fret: 2 }, { string: 5, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'Cmaj7': {
    name: 'Dó com Sétima Maior (Cmaj7)',
    description: 'Som sofisticado e "dreamy".',
    positions: [{ string: 4, fret: 2 }, { string: 5, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'G': {
    name: 'Sol Maior (G)',
    description: 'O gigante das seis cordas.',
    positions: [{ string: 1, fret: 3 }, { string: 5, fret: 2 }, { string: 6, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },

  // --- NÍVEL 2: COM SÉTIMA (7) ---
  'E7': {
    name: 'Mi com Sétima (E7)',
    description: 'Tensão clássica para Blues.',
    positions: [{ string: 3, fret: 1 }, { string: 5, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'A7': {
    name: 'Lá com Sétima (A7)',
    description: 'Aberto e relaxado.',
    positions: [{ string: 2, fret: 2 }, { string: 4, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'Am7': {
    name: 'Lá Menor com Sétima (Am7)',
    description: 'Jazzístico e leve.',
    positions: [{ string: 2, fret: 1 }, { string: 4, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'D7': {
    name: 'Ré com Sétima (D7)',
    description: 'Triângulo invertido.',
    positions: [{ string: 1, fret: 2 }, { string: 2, fret: 1 }, { string: 3, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4]
  },
  'G7': {
    name: 'Sol com Sétima (G7)',
    description: 'Prepara a volta para o Dó.',
    positions: [{ string: 1, fret: 1 }, { string: 5, fret: 2 }, { string: 6, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'C7': {
    name: 'Dó com Sétima (C7)',
    description: 'Adiciona o mindinho na corda 3.',
    positions: [{ string: 2, fret: 1 }, { string: 3, fret: 3 }, { string: 4, fret: 2 }, { string: 5, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'B7': {
    name: 'Si com Sétima (B7)',
    description: 'Complexo, mas sem pestana.',
    positions: [{ string: 1, fret: 2 }, { string: 3, fret: 2 }, { string: 4, fret: 1 }, { string: 5, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },

  // --- NÍVEL 3: PESTANAS BÁSICAS ---
  'F': {
    name: 'Fá Maior (F)',
    description: 'Pestana na casa 1.',
    positions: [{ string: 1, fret: 1 }, { string: 2, fret: 1 }, { string: 3, fret: 2 }, { string: 4, fret: 3 }, { string: 5, fret: 3 }, { string: 6, fret: 1 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'Fm': {
    name: 'Fá Menor (Fm)',
    description: 'Fá sem o dedo médio.',
    positions: [{ string: 1, fret: 1 }, { string: 2, fret: 1 }, { string: 3, fret: 1 }, { string: 4, fret: 3 }, { string: 5, fret: 3 }, { string: 6, fret: 1 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'Bm': {
    name: 'Si Menor (Bm)',
    description: 'Pestana na casa 2, formato de Am.',
    positions: [{ string: 1, fret: 2 }, { string: 2, fret: 3 }, { string: 3, fret: 4 }, { string: 4, fret: 4 }, { string: 5, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'Bm7': {
    name: 'Si Menor com Sétima (Bm7)',
    description: 'Suave e bossa-nova.',
    positions: [{ string: 2, fret: 3 }, { string: 4, fret: 4 }, { string: 5, fret: 2 }, { string: 1, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'B': {
    name: 'Si Maior (B)',
    description: 'Pestana na casa 2, formato de A.',
    positions: [{ string: 1, fret: 2 }, { string: 2, fret: 4 }, { string: 3, fret: 4 }, { string: 4, fret: 4 }, { string: 5, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'Bb': {
    name: 'Si Bemol (Bb)',
    description: 'Pestana na casa 1.',
    positions: [{ string: 1, fret: 1 }, { string: 2, fret: 3 }, { string: 3, fret: 3 }, { string: 4, fret: 3 }, { string: 5, fret: 1 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'F#': {
    name: 'Fá Sustenido (F#)',
    description: 'Pestana na casa 2.',
    positions: [{ string: 1, fret: 2 }, { string: 2, fret: 2 }, { string: 3, fret: 3 }, { string: 4, fret: 4 }, { string: 5, fret: 4 }, { string: 6, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },

  // --- NÍVEL 4: AVANÇADOS / SUSTENIDOS ---
  'F#m': {
    name: 'Fá Sustenido Menor (F#m)',
    description: 'F# sem o dedo médio.',
    positions: [{ string: 1, fret: 2 }, { string: 2, fret: 2 }, { string: 3, fret: 2 }, { string: 4, fret: 4 }, { string: 5, fret: 4 }, { string: 6, fret: 2 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'Gm': {
    name: 'Sol Menor (Gm)',
    description: 'Pestana na casa 3.',
    positions: [{ string: 1, fret: 3 }, { string: 2, fret: 3 }, { string: 3, fret: 3 }, { string: 4, fret: 5 }, { string: 5, fret: 5 }, { string: 6, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'Cm': {
    name: 'Dó Menor (Cm)',
    description: 'Pestana na casa 3, formato Am.',
    positions: [{ string: 1, fret: 3 }, { string: 2, fret: 4 }, { string: 3, fret: 5 }, { string: 4, fret: 5 }, { string: 5, fret: 3 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'C#m': {
    name: 'Dó Sustenido Menor (C#m)',
    description: 'Pestana na casa 4.',
    positions: [{ string: 1, fret: 4 }, { string: 2, fret: 5 }, { string: 3, fret: 6 }, { string: 4, fret: 6 }, { string: 5, fret: 4 }],
    unmutedStrings: [1, 2, 3, 4, 5]
  },
  'G#': {
    name: 'Sol Sustenido (G#)',
    description: 'Pestana na casa 4.',
    positions: [{ string: 1, fret: 4 }, { string: 2, fret: 4 }, { string: 3, fret: 5 }, { string: 4, fret: 6 }, { string: 5, fret: 6 }, { string: 6, fret: 4 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'G#m': {
    name: 'Sol Sustenido Menor (G#m)',
    description: 'G# sem o dedo médio.',
    positions: [{ string: 1, fret: 4 }, { string: 2, fret: 4 }, { string: 3, fret: 4 }, { string: 4, fret: 6 }, { string: 5, fret: 6 }, { string: 6, fret: 4 }],
    unmutedStrings: [1, 2, 3, 4, 5, 6]
  },
  'A9': {
    name: 'Lá com Nona (A9)',
    description: 'Pestana jazz na casa 4.',
    positions: [{ string: 2, fret: 2 }, { string: 3, fret: 4 }, { string: 4, fret: 2 }, { string: 5, fret: 4 }],
    unmutedStrings: [2, 3, 4, 5]
  }
};

export const LEVELS: LevelData[] = [
  {
    id: GameLevel.MAJORS,
    title: 'Nível 1: Fundamentos',
    chords: ['E', 'Em', 'Am', 'A', 'Asus2', 'D', 'Dm', 'Dsus4', 'C', 'Cmaj7', 'G'],
    unlockThreshold: 0,
    pointsPerChord: 130
  },
  {
    id: GameLevel.MINORS,
    title: 'Nível 2: Sétimas e Expressão',
    chords: ['E7', 'A7', 'Am7', 'D7', 'G7', 'C7', 'B7'],
    unlockThreshold: 1300, // Equivale a ~10 acordes do nível 1
    pointsPerChord: 250
  },
  {
    id: GameLevel.BARRE,
    title: 'Nível 3: O Desafio da Pestana',
    chords: ['F', 'Fm', 'Bm', 'Bm7', 'B', 'Bb', 'F#'],
    unlockThreshold: 3800, // ~10 acordes do nível 2
    pointsPerChord: 500
  },
  {
    id: 4 as GameLevel,
    title: 'Nível 4: Mestria Cromática',
    chords: ['F#m', 'Gm', 'Cm', 'C#m', 'G#', 'G#m', 'A9'],
    unlockThreshold: 8800, // ~10 acordes do nível 3
    pointsPerChord: 1000
  }
];

export const MOTIVATIONAL_MESSAGES = [
  "Errar faz parte do aprendizado.",
  "Cada aluno tem seu tempo.",
  "Aqui o importante é evoluir.",
  "A prática traz clareza ao som.",
  "Mantenha o punho relaxado!",
  "Sua memória muscular está crescendo!"
];
