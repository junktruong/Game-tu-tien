import { MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Missing MONGODB_URI in environment');
}

const client = new MongoClient(uri);

const clientPromise = global._mongoClientPromise ?? client.connect();

if (!global._mongoClientPromise) {
  global._mongoClientPromise = clientPromise;
}

export async function getMongoClient() {
  return clientPromise;
}
