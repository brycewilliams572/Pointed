export interface Player {
  id: string;
  name: string;
  color: string;
  score: number;
  displayOrder: number;
}

export interface Game {
  id: string;
  name?: string;
  players: Player[];
}
