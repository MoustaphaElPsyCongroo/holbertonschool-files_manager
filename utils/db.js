import { MongoClient } from 'mongodb';
import { env } from 'process';

const url = env.DB_HOST || 'localhost';
const port = env.DB_PORT || 27017;
const database = env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    MongoClient.connect(`mongodb://${url}:${port}`, { useUnifiedTopology: true }, (err, client) => {
      if (err) throw new Error(err);

      this.db = client.db(database);
    });
  }

  isAlive() {
    return this.db !== undefined;
  }

  async nbUsers() {
    const count = await this.db.collection('users').countDocuments();
    return count;
  }

  async nbFiles() {
    const count = await this.db.collection('users').countDocuments();
    return count;
  }
}

const dbClient = new DBClient();
export default dbClient;
