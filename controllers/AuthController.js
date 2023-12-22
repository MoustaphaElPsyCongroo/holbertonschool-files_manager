import sha1 from 'sha1';
import { v4 as uuid4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const encoded = req.headers.authorization.split(' ');

    if (encoded.length < 2) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    const decoded = Buffer.from(encoded[1], 'base64').toString('utf8');
    const [email, password] = decoded.split(':');

    if (!email || !password) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ email, password: sha1(password) });

    if (!user) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    const token = uuid4();
    const key = `auth_${token}`;
    const duration = 86400;
    const userId = user._id.toString();

    await redisClient.set(key, userId, duration);
    res.status(200);
    return res.send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const user = await redisClient.get(key);

    if (!user) {
      res.status(401);
      return res.send({ error: 'Unauthorized' });
    }

    await redisClient.del(key);
    res.status(204);
    return res.end();
  }
}

export default AuthController;
