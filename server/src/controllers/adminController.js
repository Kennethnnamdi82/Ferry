import User from '../models/User.js';
import Document from '../models/Document.js';
import Vault from '../models/Vault.js';
import ShareLink from '../models/ShareLink.js';
import ActivityLog from '../models/ActivityLog.js';
import VaultMember from '../models/VaultMember.js';
import cloudinary from '../config/cloudinary.js';
import { resourceTypeForDocument } from '../utils/cloudinaryDownload.js';

async function destroyCloudFile(doc) {
  if (!doc?.storageKey) return;
  try {
    await cloudinary.uploader.destroy(doc.storageKey, {
      type: 'authenticated',
      resource_type: resourceTypeForDocument(doc),
    });
  } catch (e) {
    console.error('Cloudinary destroy failed', doc.storageKey, e.message);
  }
}

export const stats = async (_req, res) => {
  const [users, documents, deletedDocs, vaults, sharesActive, storageAgg, recent] = await Promise.all([
    User.countDocuments(),
    Document.countDocuments({ deletedAt: null }),
    Document.countDocuments({ deletedAt: { $ne: null } }),
    Vault.countDocuments({ deletedAt: null }),
    ShareLink.countDocuments({ revokedAt: null }),
    Document.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]),
    ActivityLog.find().sort({ createdAt: -1 }).limit(12).populate('user', 'name email'),
  ]);
  res.json({
    totalUsers: users,
    totalDocuments: documents,
    deletedDocuments: deletedDocs,
    totalVaults: vaults,
    activeShares: sharesActive,
    totalStorage: storageAgg[0]?.total || 0,
    recentActivity: recent,
  });
};

export const listUsers = async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
};

export const updateUser = async (req, res) => {
  const { status, role } = req.body;
  const update = {};
  if (status && ['active', 'suspended'].includes(status)) update.status = status;
  if (role && ['user', 'admin'].includes(role)) update.role = role;
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!user) return res.status(404).json({ message: 'Not found' });
  await ActivityLog.create({
    user: req.user._id,
    action: 'admin_action',
    target: user._id.toString(),
    meta: { type: 'update_user', update },
  });
  res.json({ user });
};

export const deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'Not found' });
  const docs = await Document.find({ owner: user._id });
  await Promise.all(docs.map(destroyCloudFile));
  await Document.deleteMany({ owner: user._id });
  const ownedVaults = await Vault.find({ owner: user._id }).select('_id');
  const vaultIds = ownedVaults.map((v) => v._id);
  await VaultMember.deleteMany({ $or: [{ user: user._id }, { vault: { $in: vaultIds } }] });
  await ShareLink.deleteMany({ createdBy: user._id });
  await Vault.deleteMany({ owner: user._id });
  await ActivityLog.create({
    user: req.user._id,
    action: 'admin_action',
    target: user._id.toString(),
    meta: { type: 'delete_user' },
  });
  res.json({ ok: true });
};

export const listDocuments = async (_req, res) => {
  const documents = await Document.find()
    .sort({ createdAt: -1 })
    .populate('owner', 'name email')
    .populate('vault', 'name');
  const safe = documents.map((d) => ({
    _id: d._id,
    name: d.name,
    description: d.description,
    category: d.category,
    mimeType: d.mimeType,
    size: d.size,
    flagged: d.flagged,
    deletedAt: d.deletedAt,
    owner: d.owner,
    vault: d.vault,
    createdAt: d.createdAt,
  }));
  res.json({ documents: safe });
};

export const deleteDocument = async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Not found' });
  await destroyCloudFile(doc);
  await ShareLink.deleteMany({ document: doc._id });
  await Document.deleteOne({ _id: doc._id });
  await User.findByIdAndUpdate(doc.owner, { $inc: { storageUsed: -doc.size } });
  await ActivityLog.create({
    user: req.user._id,
    action: 'admin_action',
    target: doc._id.toString(),
    meta: { type: 'delete_document' },
  });
  res.json({ ok: true });
};

export const listVaults = async (_req, res) => {
  const vaults = await Vault.find().sort({ createdAt: -1 }).populate('owner', 'name email');
  const counts = await Promise.all(
    vaults.map((v) =>
      Document.countDocuments({ vault: v._id, deletedAt: null }).then((n) => [v._id.toString(), n]),
    ),
  );
  const map = Object.fromEntries(counts);
  res.json({
    vaults: vaults.map((v) => ({
      _id: v._id,
      name: v.name,
      owner: v.owner,
      deletedAt: v.deletedAt,
      documentCount: map[v._id.toString()] || 0,
      createdAt: v.createdAt,
    })),
  });
};

export const listShares = async (_req, res) => {
  const shares = await ShareLink.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('document', 'name')
    .populate('createdBy', 'name email');
  res.json({ shares });
};

export const logs = async (_req, res) => {
  const logs = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('user', 'name email');
  res.json({ logs });
};
