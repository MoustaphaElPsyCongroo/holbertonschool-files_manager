import { ObjectId } from 'mongodb';
import { v4 as uuid4 } from 'uuid';
import fs from 'fs';
import dbClient from './db';
import getUser from './users';

async function addFileToDB(userId, name, type, parentId, isPublic, localPath = null) {
  let newFile;

  if (localPath) {
    newFile = await dbClient.db.collection('files').insertOne({
      userId, name, type, isPublic, parentId, localPath,
    });
  } else {
    newFile = await dbClient.db.collection('files').insertOne({
      userId, name, type, isPublic, parentId,
    });
  }

  return newFile;
}

async function addFileToLocalFolder(path, newFolderPath, data) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path, { recursive: true });
  }

  const content = Buffer.from(data, 'base64').toString('utf-8');
  fs.writeFile(newFolderPath, content, (err) => {
    if (err) console.log(err);
  });
}

async function checkRequest(res, req, token) {
  const user = await getUser(token);

  if (!user) {
    return res.status(401).send({ error: 'Unauthorized' });
  }

  const userId = user._id;
  const { name } = req.body;
  if (!name) {
    return res.status(400).send({ error: 'Missing name' });
  }

  const { type } = req.body;
  if (!type || !['folder', 'file', 'image'].includes(type)) {
    return res.status(400).send({ error: 'Missing type' });
  }

  const { isPublic = false } = req.body;
  const { data } = req.body;

  if (!data && type !== 'folder') {
    return res.status(400).send({ error: 'Missing data' });
  }

  let { parentId } = req.body;
  if (parentId) {
    parentId = ObjectId(parentId);
    const file = await dbClient.db.collection('files').findOne({ _id: parentId });
    if (!file) {
      return res.status(400).send({ error: 'Parent not found' });
    }

    if (file.type !== 'folder') {
      return res.status(400).send({ error: 'Parent is not a folder' });
    }
  } else {
    parentId = 0;
  }

  return ({
    userId, name, type, parentId, isPublic, data,
  });
}

async function uploadFile(res, userId, name, type, parentId, isPublic, data) {
  let newFile;

  if (type === 'folder') {
    newFile = await addFileToDB(userId, name, type, parentId, isPublic);
  } else {
    const path = process.env.FOLDER_PATH || '/tmp/files_manager';
    const newFolderPath = `${path}/${uuid4()}`;

    addFileToLocalFolder(path, newFolderPath, data);
    newFile = await addFileToDB(userId, name, type, parentId, isPublic, newFolderPath);
  }

  return res.status(201).send({
    id: newFile.insertedId, userId, name, type, isPublic, parentId,
  });
}

export {
  checkRequest, uploadFile,
};
