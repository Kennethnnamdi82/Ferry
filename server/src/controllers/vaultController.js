import { z } from 'zod';
import Vault from '../models/Vault.js';
import VaultMember from '../models/VaultMember.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';
import { getVaultRole } from '../utils/vaultAccess.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  icon: z.string().max(32).optional(),
  color: z.string().max(16).optional(),
  allowViewerDownload: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const list = async (req, res) => {
  const memberships = await VaultMember.find({ user: req.user._id }).select('vault');
  const memberIds = memberships.map((m) => m.vault);
  const vaults = await Vault.find({
    deletedAt: null,
    $or: [{ owner: req.user._id }, { _id: { $in: memberIds } }],
  })
    .sort({ createdAt: -1 })
    .populate('owner', 'name email');

  const counts = await Promise.all(
    vaults.map((v) =>
      Document.countDocuments({ vault: v._id, deletedAt: null }).then((n) => ({ id: v._id.toString(), n })),
    ),
  );
  const countMap = Object.fromEntries(counts.map((c) => [c.id, c.n]));

  const data = vaults.map((v) => ({
    _id: v._id,
    name: v.name,
    description: v.description,
    icon: v.icon,
    color: v.color,
    allowViewerDownload: v.allowViewerDownload,
    owner: v.owner,
    role: v.owner._id.toString() === req.user._id.toString() ? 'editor' : 'viewer',
    documentCount: countMap[v._id.toString()] || 0,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  }));
  res.json({ vaults: data });
};

export const get = async (req, res) => {
  const { vault, role } = await getVaultRole(req.params.id, req.user._id);
  if (!vault || !role) return res.status(404).json({ message: 'Vault not found' });
  await vault.populate('owner', 'name email');
  const documentCount = await Document.countDocuments({ vault: vault._id, deletedAt: null });
  res.json({
    vault: {
      _id: vault._id,
      name: vault.name,
      description: vault.description,
      icon: vault.icon,
      color: vault.color,
      allowViewerDownload: vault.allowViewerDownload,
      owner: vault.owner,
      role,
      documentCount,
      createdAt: vault.createdAt,
      updatedAt: vault.updatedAt,
    },
  });
};

export const create = async (req, res) => {
  const data = createSchema.parse(req.body);
  const vault = await Vault.create({ ...data, owner: req.user._id });
  await ActivityLog.create({
    user: req.user._id,
    action: 'vault_create',
    target: vault._id.toString(),
    meta: { name: vault.name },
    ip: req.ip,
  });
  res.status(201).json({ vault });
};

export const update = async (req, res) => {
  const data = updateSchema.parse(req.body);
  const { vault, role } = await getVaultRole(req.params.id, req.user._id);
  if (!vault || role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  Object.assign(vault, data);
  await vault.save();
  await ActivityLog.create({
    user: req.user._id,
    action: 'vault_update',
    target: vault._id.toString(),
    ip: req.ip,
  });
  res.json({ vault });
};

export const remove = async (req, res) => {
  const { vault, role } = await getVaultRole(req.params.id, req.user._id);
  if (!vault || role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  vault.deletedAt = new Date();
  await vault.save();
  await Document.updateMany({ vault: vault._id, deletedAt: null }, { deletedAt: new Date() });
  await ActivityLog.create({
    user: req.user._id,
    action: 'vault_delete',
    target: vault._id.toString(),
    ip: req.ip,
  });
  res.json({ ok: true });
};

export const listMembers = async (req, res) => {
  const { vault, role } = await getVaultRole(req.params.id, req.user._id);
  if (!vault || !role) return res.status(404).json({ message: 'Vault not found' });
  const members = await VaultMember.find({ vault: vault._id }).populate('user', 'name email');
  await vault.populate('owner', 'name email');
  res.json({
    owner: { _id: vault.owner._id, name: vault.owner.name, email: vault.owner.email, role: 'editor' },
    members: members.map((m) => ({
      _id: m._id,
      user: m.user,
      role: m.role,
      createdAt: m.createdAt,
    })),
  });
};

export const invite = async (req, res) => {
  const { email } = inviteSchema.parse(req.body);
  const { vault, role } = await getVaultRole(req.params.id, req.user._id);
  if (!vault || role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'No Ferry account with that email' });
  if (user._id.toString() === vault.owner.toString()) {
    return res.status(400).json({ message: 'You are already the editor of this vault' });
  }
  const existing = await VaultMember.findOne({ vault: vault._id, user: user._id });
  if (existing) return res.status(409).json({ message: 'User is already a member' });
  const member = await VaultMember.create({
    vault: vault._id,
    user: user._id,
    role: 'viewer',
    invitedBy: req.user._id,
  });
  await ActivityLog.create({
    user: req.user._id,
    action: 'invite',
    target: vault._id.toString(),
    meta: { invited: user.email },
    ip: req.ip,
  });
  res.status(201).json({ member: { _id: member._id, user: { _id: user._id, name: user.name, email: user.email }, role: member.role } });
};

export const removeMember = async (req, res) => {
  const { vault, role } = await getVaultRole(req.params.id, req.user._id);
  if (!vault || role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  const member = await VaultMember.findOneAndDelete({ _id: req.params.memberId, vault: vault._id });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await ActivityLog.create({
    user: req.user._id,
    action: 'invite_remove',
    target: vault._id.toString(),
    ip: req.ip,
  });
  res.json({ ok: true });
};
