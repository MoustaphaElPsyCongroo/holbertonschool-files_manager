import { ObjectId } from 'mongodb';
import redisClient from './redis';
import dbClient from './db';

async function getUser(token) {
  const key = `auth_${token}`;
  const userId = await redisClient.get(key);

  if (!userId) {
    return null;
  }

  const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

  if (!user) {
    return null;
  }

  return user;
}

export default getUser;
