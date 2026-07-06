import { Router } from 'express';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import * as c from '../controllers/adminController.js';

const router = Router();
router.use(auth, admin);
router.get('/stats', c.stats);
router.get('/users', c.listUsers);
router.patch('/users/:id', c.updateUser);
router.delete('/users/:id', c.deleteUser);
router.get('/documents', c.listDocuments);
router.delete('/documents/:id', c.deleteDocument);
router.get('/vaults', c.listVaults);
router.get('/shares', c.listShares);
router.get('/logs', c.logs);

export default router;
