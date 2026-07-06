import { Router } from 'express';
import auth from '../middleware/auth.js';
import * as c from '../controllers/vaultController.js';

const router = Router();
router.use(auth);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', c.remove);
router.get('/:id/members', c.listMembers);
router.post('/:id/members', c.invite);
router.delete('/:id/members/:memberId', c.removeMember);

export default router;
