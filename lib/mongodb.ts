import { MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Missing MONGODB_URI in environment');
}

const mongoUri = uri;

export async function getMongoClient() {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}
