import { Router } from 'express';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as c from '../controllers/documentController.js';

const router = Router();
router.use(auth);
router.get('/', c.list);
router.post('/', upload.single('file'), c.create);
router.get('/:id', c.get);
router.get('/:id/preview', c.preview);
router.get('/:id/download', c.download);
router.put('/:id', c.update);
router.post('/:id/restore', c.restore);
router.delete('/:id/purge', c.purge);
router.delete('/:id', c.remove);

export default router;
