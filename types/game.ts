export type AccountProfile = {
  displayName: string;
  tagline: string;
};

export type CharacterProfile = {
  id: string;
  name: string;
  role: string;
  level: number;
  skills: string[];
  description: string;
};

export type SkinProfile = {
  id: string;
  name: string;
  tone: string;
  effect: string;
};

export type ArenaProfile = {
  id: string;
  name: string;
  description: string;
};

export type RoomProfile = {
  id: string;
  title: string;
  arenaId: string;
  mode: string;
  occupancy: number;
  capacity: number;
  isPublic: boolean;
};

export type GameData = {
  account: AccountProfile;
  characters: CharacterProfile[];
  skins: SkinProfile[];
  arenas: ArenaProfile[];
  rooms: RoomProfile[];
};
