import { Router } from 'express';
import auth from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';

const router = Router();
router.use(auth);

router.get('/', async (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const filter = { user: req.user._id };
  const [logs, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  res.json({ logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

export default router;
