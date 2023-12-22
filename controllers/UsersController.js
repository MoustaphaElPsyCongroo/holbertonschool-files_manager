import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400);
      return res.send({ error: 'Missing email' });
    }

    if (!password) {
      res.status(400);
      return res.send({ error: 'Missing password' });
    }

    const user = await dbClient.db.collection('users').findOne({ email });

    if (user) {
      res.status(400);
      return res.send({ error: 'Already exist' });
    }

    const hashedPassword = sha1(password);
    const newUser = await dbClient.db.collection('users').insertOne({
      email,
      password: hashedPassword,
    });
    const id = newUser.insertedId;

    res.status(201);
    return res.send({ id, email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!userId) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });

    if (!user) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    res.status(200);
    return res.send({ id: user._id, email: user.email });
  }
}

export default UsersController;
