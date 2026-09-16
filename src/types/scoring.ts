export type ScoreChangeMethod = 'preset' | 'manual' | 'set';

export type ScoreInputResult = { value: number; error?: never } | { value?: never; error: string };
