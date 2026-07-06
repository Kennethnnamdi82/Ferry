import { z } from 'zod';
import Document from '../models/Document.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import Vault from '../models/Vault.js';
import VaultMember from '../models/VaultMember.js';
import cloudinary from '../config/cloudinary.js';
import { getVaultRole } from '../utils/vaultAccess.js';
import { resourceTypeForDocument, signedDownloadUrlForDocument } from '../utils/cloudinaryDownload.js';

export const CATEGORIES = ['Identity', 'Education', 'Property', 'Medical', 'Financial', 'Other'];

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  category: z.enum(CATEGORIES).optional(),
  tags: z.array(z.string().trim().max(30)).max(20).optional(),
});

export const list = async (req, res) => {
  const {
    vault: vaultId,
    category,
    q,
    sort = 'newest',
    page = '1',
    limit = '24',
    trash = 'false',
    type,
    minSize,
    maxSize,
    dateFrom,
    dateTo,
  } = req.query;

  const filter = {};
  if (trash === 'true') filter.deletedAt = { $ne: null };
  else filter.deletedAt = null;

  if (vaultId) {
    const { vault, role } = await getVaultRole(vaultId, req.user._id, { includeDeleted: trash === 'true' });
    if (!vault || !role) return res.status(404).json({ message: 'Vault not found' });
    filter.vault = vault._id;
  } else {
    const memberships = await VaultMember.find({ user: req.user._id }).select('vault');
    const ownedVaults = await Vault.find({ owner: req.user._id }).select('_id');
    const ids = [...ownedVaults.map((v) => v._id), ...memberships.map((m) => m.vault)];
    filter.vault = { $in: ids };
  }

  if (category && CATEGORIES.includes(category)) filter.category = category;

  if (type) {
    const typeMap = {
      image: /^image\//i,
      pdf: /^application\/pdf$/i,
      doc: /(msword|officedocument\.wordprocessing)/i,
      sheet: /(excel|officedocument\.spreadsheet)/i,
      video: /^video\//i,
      audio: /^audio\//i,
      text: /^text\//i,
    };
    if (typeMap[type]) filter.mimeType = typeMap[type];
  }

  const sizeFilter = {};
  if (minSize) sizeFilter.$gte = Number(minSize);
  if (maxSize) sizeFilter.$lte = Number(maxSize);
  if (Object.keys(sizeFilter).length) filter.size = sizeFilter;

  const dateFilter = {};
  if (dateFrom) dateFilter.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    dateFilter.$lte = end;
  }
  if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

  if (q) {
    const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { description: rx }, { tags: rx }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    largest: { size: -1 },
    name: { name: 1 },
  };

  const [items, total] = await Promise.all([
    Document.find(filter)
      .sort(sortMap[sort] || sortMap.newest)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('owner', 'name email'),
    Document.countDocuments(filter),
  ]);

  res.json({
    documents: items,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
};

async function loadDocForRead(req) {
  const doc = await Document.findById(req.params.id);
  if (!doc) return { error: { status: 404, message: 'Not found' } };
  const { role } = await getVaultRole(doc.vault, req.user._id, { includeDeleted: true });
  if (!role) return { error: { status: 403, message: 'Forbidden' } };
  return { doc, role };
}

export const get = async (req, res) => {
  const { doc, role, error } = await loadDocForRead(req);
  if (error) return res.status(error.status).json({ message: error.message });
  await doc.populate('owner', 'name email');
  res.json({ document: doc, role });
};

export const create = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const { name, description = '', tags = '', category = 'Other', vault: vaultId } = req.body;
  if (!vaultId) return res.status(400).json({ message: 'vault is required' });
  const { vault, role } = await getVaultRole(vaultId, req.user._id);
  if (!vault) return res.status(404).json({ message: 'Vault not found' });
  if (role !== 'editor') return res.status(403).json({ message: 'Only the vault editor can upload' });

  const tagList = String(tags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const safeCategory = CATEGORIES.includes(category) ? category : 'Other';

  const doc = await Document.create({
    owner: req.user._id,
    vault: vault._id,
    name: name || req.file.originalname,
    description,
    category: safeCategory,
    tags: tagList,
    mimeType: req.file.mimetype,
    size: req.file.size,
    storageProvider: 'cloudinary',
    storageKey: req.file.filename,
    url: req.file.path,
  });

  await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: req.file.size } });
  await ActivityLog.create({
    user: req.user._id,
    action: 'upload',
    target: doc._id.toString(),
    meta: { name: doc.name, size: doc.size, vault: vault._id.toString() },
    ip: req.ip,
  });

  res.status(201).json({ document: doc });
};

export const update = async (req, res) => {
  const data = updateSchema.parse(req.body);
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id);
  if (role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  Object.assign(doc, data);
  await doc.save();
  await ActivityLog.create({
    user: req.user._id,
    action: 'update',
    target: doc._id.toString(),
    ip: req.ip,
  });
  res.json({ document: doc });
};

export const remove = async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id);
  if (role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  if (!doc.deletedAt) {
    doc.deletedAt = new Date();
    await doc.save();
  }
  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    target: doc._id.toString(),
    ip: req.ip,
  });
  res.json({ ok: true });
};

export const restore = async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id, { includeDeleted: true });
  if (role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  doc.deletedAt = null;
  await doc.save();
  await ActivityLog.create({ user: req.user._id, action: 'restore', target: doc._id.toString(), ip: req.ip });
  res.json({ document: doc });
};

export const purge = async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id, { includeDeleted: true });
  if (role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  try {
    await cloudinary.uploader.destroy(doc.storageKey, {
      type: 'authenticated',
      resource_type: resourceTypeForDocument(doc),
    });
  } catch (e) {
    console.error('Cloudinary delete failed', e);
  }
  await User.findByIdAndUpdate(doc.owner, { $inc: { storageUsed: -doc.size } });
  await Document.deleteOne({ _id: doc._id });
  await ActivityLog.create({ user: req.user._id, action: 'purge', target: doc._id.toString(), ip: req.ip });
  res.json({ ok: true });
};

export const download = async (req, res) => {
  const { doc, role, error } = await loadDocForRead(req);
  if (error) return res.status(error.status).json({ message: error.message });
  if (role === 'viewer') {
    const { vault } = await getVaultRole(doc.vault, req.user._id, { includeDeleted: true });
    if (!vault.allowViewerDownload) {
      return res.status(403).json({ message: 'Viewer downloads are disabled for this vault' });
    }
  }
  const { url: signedUrl, expiresAt: expires } = signedDownloadUrlForDocument(doc, 60, { attachment: true });
  await ActivityLog.create({
    user: req.user._id,
    action: 'download',
    target: doc._id.toString(),
    ip: req.ip,
  });
  res.json({ url: signedUrl, expiresAt: expires });
};

export const preview = async (req, res) => {
  const { doc, error } = await loadDocForRead(req);
  if (error) return res.status(error.status).json({ message: error.message });
  const { url: signedUrl, expiresAt: expires } = signedDownloadUrlForDocument(doc, 300);
  res.json({ url: signedUrl, expiresAt: expires, mimeType: doc.mimeType });
};
