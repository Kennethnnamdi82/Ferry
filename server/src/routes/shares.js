import { Router } from 'express';
import auth from '../middleware/auth.js';
import * as c from '../controllers/shareController.js';

const router = Router();
router.get('/:token', c.publicGet);
router.post('/:token/file', c.publicFile);
router.post('/:token/content', c.publicContent);

router.post('/', auth, c.create);
router.get('/document/:documentId', auth, c.listForDocument);
router.delete('/:id', auth, c.revoke);

export default router;
