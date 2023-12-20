import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      res.status(400);
      return res.send('Missing email');
    }

    if (!password) {
      res.status(400);
      return res.send('Missing password');
    }

    const user = await dbClient.db.collection('users').findOne({ email });

    if (user) {
      res.status(400);
      return res.send('Already exist');
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
}

export default UsersController;
