import { checkRequest, uploadFile } from '../utils/files';

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
}

export default FilesController;
