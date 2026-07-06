import { Router } from 'express';
import auth from '../middleware/auth.js';
import * as c from '../controllers/exportController.js';

const router = Router();
router.use(auth);
router.post('/zip', c.zip);
router.post('/pdf', c.toPdf);

export default router;
