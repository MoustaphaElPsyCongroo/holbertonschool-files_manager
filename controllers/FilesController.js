import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import { checkRequest, uploadFile } from '../utils/files';
import { getUserFromToken } from '../utils/users';

class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const {
      userId, name, type, parentId, isPublic, data,
    } = await checkRequest(res, req, token);

    if (!userId || !name || !type || (!data && type !== 'folder')) {
      return false;
    }

    await uploadFile(res, userId, name, type, parentId, isPublic, data);
    return true;
  }

  static async getShow(req, res) {
    const fileId = req.params.id;
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const userId = user._id;
    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(fileId), userId });

    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    return res.status(200).send({
      ...file,
      id: file._id,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    let { parentId = 0 } = req.query;
    let match = {};

    if (parentId) {
      parentId = ObjectId(parentId);
    }

    match = { parentId };
    const { page = 0 } = req.query;
    const pipeline = [{ $match: match }, { $skip: page * 20 }, { $limit: 20 }, {
      $project: {
        id: '$_id', _id: 0, userId: 1, name: 1, type: 1, isPublic: 1, parentId: 1,
      },
    }];

    const paginatedFilesCollection = await dbClient.db.collection('files').aggregate(pipeline);
    const paginatedFiles = await paginatedFilesCollection.toArray();

    return res.status(200).send(paginatedFiles);
  }
}

export default FilesController;
