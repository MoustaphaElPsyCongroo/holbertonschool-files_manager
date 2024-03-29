import { ObjectId } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
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
      match = { parentId };
    }

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

  static async putPublish(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const updateResult = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(req.params.id), userId: user._id },
      { $set: { isPublic: true } },
      { projection: { localPath: 0 }, returnDocument: 'after' },
    );

    if (updateResult.lastErrorObject.updatedExisting === false) {
      return res.status(404).send({ error: 'Not found' });
    }
    return res.status(200).send(updateResult.value);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];

    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const updateResult = await dbClient.db.collection('files').findOneAndUpdate(
      { _id: ObjectId(req.params.id), userId: user._id },
      { $set: { isPublic: false } },
      { projection: { localPath: 0 }, returnDocument: 'after' },
    );

    if (updateResult.lastErrorObject.updatedExisting === false) {
      return res.status(404).send({ error: 'Not found' });
    }
    return res.status(200).send(updateResult.value);
  }

  static async getFile(req, res) {
    const { id = '' } = req.params;

    if (id === '') {
      return res.status(404).send({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });
    if (!file) {
      return res.status(404).send({ error: 'Not found' });
    }

    const { size = 0 } = req.query;
    let path;
    if (!size) {
      path = file.localPath;
    } else {
      path = `${file.localPath}_${size}`;
    }

    if (!file.isPublic) {
      const token = req.headers['x-token'];

      if (!token) {
        return res.status(401).send({ error: 'Unauthorized' });
      }

      const user = await getUserFromToken(token);

      if (!user || file.userId.toString() !== user._id.toString()) {
        return res.status(401).send({ error: 'Not found' });
      }
    }

    if (file.type === 'folder') {
      return res.status(400).send({ error: "A folder does't have content" });
    }

    try {
      const data = fs.readFileSync(path);
      const mimeType = mime.contentType(file.name);
      res.setHeader('Content-Type', mimeType);

      return res.status(200).send(data);
    } catch (err) {
      return res.status(404).send({ error: 'Not found' });
    }
  }
}

export default FilesController;
