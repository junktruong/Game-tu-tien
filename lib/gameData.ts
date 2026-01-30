import type { GameData, RoomProfile } from '../types/game';
import { seedData } from './seedData';
import { getMongoClient } from './mongodb';

const DB_NAME = 'tu_tien_fight';
const COLLECTION = 'game_data';

export async function getGameData(): Promise<GameData> {
  const client = await getMongoClient();
  const db = client.db(DB_NAME);
  const collection = db.collection<GameData>(COLLECTION);

  const existing = await collection.findOne({});
  if (existing) {
    return existing;
  }

  await collection.insertOne(seedData);
  return seedData;
}

export async function addRoom(room: RoomProfile) {
  const client = await getMongoClient();
  const db = client.db(DB_NAME);
  const collection = db.collection<GameData>(COLLECTION);

  await collection.updateOne(
    {},
    { $push: { rooms: room } },
    { upsert: true },
  );

  return room;
}
