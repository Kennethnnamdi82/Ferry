import { z } from 'zod';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import Document from '../models/Document.js';
import ShareLink from '../models/ShareLink.js';
import ActivityLog from '../models/ActivityLog.js';
import { getVaultRole } from '../utils/vaultAccess.js';
import { signedDownloadUrlForDocument } from '../utils/cloudinaryDownload.js';

const createSchema = z.object({
  documentId: z.string().min(1),
  allowDownload: z.boolean().optional().default(true),
  expiresInHours: z.number().int().min(1).max(24 * 30).nullable().optional(),
  maxViews: z.number().int().min(1).max(10000).nullable().optional(),
  maxDownloads: z.number().int().min(1).max(10000).nullable().optional(),
  password: z.string().min(4).max(100).nullable().optional(),
});

function isLinkValid(link) {
  if (!link) return false;
  if (link.revokedAt) return false;
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return false;
  if (link.maxViews !== null && link.views >= link.maxViews) return false;
  return true;
}

function redact(link) {
  const obj = link.toObject ? link.toObject() : { ...link };
  obj.hasPassword = !!obj.passwordHash;
  delete obj.passwordHash;
  return obj;
}

function safeName(name) {
  return String(name || 'document').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180);
}

async function loadPublicShare(req) {
  const link = await ShareLink.findOne({ token: req.params.token }).populate('document');
  if (!isLinkValid(link) || !link.document || link.document.deletedAt) {
    return { error: { status: 404, message: 'This link is no longer available' } };
  }
  if (link.passwordHash) {
    const provided = req.body?.password || req.query.password;
    if (!provided) return { error: { status: 401, message: 'Password required', requiresPassword: true } };
    const ok = await bcrypt.compare(String(provided), link.passwordHash);
    if (!ok) return { error: { status: 401, message: 'Incorrect password', requiresPassword: true } };
  }
  return { link };
}

async function recordPublicAccess(link, req, wantDownload) {
  if (wantDownload && !link.allowDownload) {
    return { error: { status: 403, message: 'Downloads are disabled for this link' } };
  }
  if (wantDownload && link.maxDownloads !== null && link.downloads >= link.maxDownloads) {
    return { error: { status: 403, message: 'Download limit reached for this link' } };
  }
  if (wantDownload) link.downloads += 1;
  else link.views += 1;
  await link.save();
  await ActivityLog.create({
    user: link.createdBy,
    action: wantDownload ? 'share_download' : 'share_view',
    target: link.document._id.toString(),
    meta: { token: link.token },
    ip: req.ip,
  });
  return {};
}

export const create = async (req, res) => {
  const data = createSchema.parse(req.body);
  const doc = await Document.findOne({ _id: data.documentId, deletedAt: null });
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id);
  if (role !== 'editor') return res.status(403).json({ message: 'Only the editor can create share links' });

  const link = await ShareLink.create({
    document: doc._id,
    createdBy: req.user._id,
    token: crypto.randomBytes(20).toString('base64url'),
    allowDownload: data.allowDownload,
    expiresAt: data.expiresInHours ? new Date(Date.now() + data.expiresInHours * 3600 * 1000) : null,
    maxViews: data.maxViews ?? null,
    maxDownloads: data.maxDownloads ?? null,
    passwordHash: data.password ? await bcrypt.hash(data.password, 10) : null,
  });
  await ActivityLog.create({
    user: req.user._id,
    action: 'share_create',
    target: doc._id.toString(),
    meta: { token: link.token },
    ip: req.ip,
  });
  res.status(201).json({ share: redact(link) });
};

export const listForDocument = async (req, res) => {
  const doc = await Document.findById(req.params.documentId);
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id);
  if (role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  const shares = await ShareLink.find({ document: doc._id }).sort({ createdAt: -1 });
  res.json({ shares: shares.map(redact) });
};

export const revoke = async (req, res) => {
  const link = await ShareLink.findById(req.params.id);
  if (!link) return res.status(404).json({ message: 'Not found' });
  const doc = await Document.findById(link.document);
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  const { role } = await getVaultRole(doc.vault, req.user._id);
  if (role !== 'editor') return res.status(403).json({ message: 'Editor access required' });
  link.revokedAt = new Date();
  await link.save();
  await ActivityLog.create({
    user: req.user._id,
    action: 'share_revoke',
    target: doc._id.toString(),
    meta: { token: link.token },
    ip: req.ip,
  });
  res.json({ ok: true });
};

export const publicGet = async (req, res) => {
  const link = await ShareLink.findOne({ token: req.params.token }).populate('document');
  if (!isLinkValid(link) || !link.document || link.document.deletedAt) {
    return res.status(404).json({ message: 'This link is no longer available' });
  }
  res.json({
    document: {
      _id: link.document._id,
      name: link.document.name,
      mimeType: link.document.mimeType,
      size: link.document.size,
      createdAt: link.document.createdAt,
    },
    allowDownload: link.allowDownload,
    expiresAt: link.expiresAt,
    requiresPassword: !!link.passwordHash,
  });
};

export const publicFile = async (req, res) => {
  const { link, error } = await loadPublicShare(req);
  if (error) return res.status(error.status).json(error);
  const wantDownload = req.query.download === '1' || req.body?.download === true;
  const access = await recordPublicAccess(link, req, wantDownload);
  if (access.error) return res.status(access.error.status).json({ message: access.error.message });
  const { url: signedUrl, expiresAt: expires } = signedDownloadUrlForDocument(
    link.document,
    120,
    wantDownload ? { attachment: true } : {},
  );
  res.json({ url: signedUrl, expiresAt: expires });
};

export const publicContent = async (req, res) => {
  const { link, error } = await loadPublicShare(req);
  if (error) return res.status(error.status).json(error);
  const wantDownload = req.query.download === '1' || req.body?.download === true;
  const access = await recordPublicAccess(link, req, wantDownload);
  if (access.error) return res.status(access.error.status).json({ message: access.error.message });

  const { url } = signedDownloadUrlForDocument(
    link.document,
    120,
    wantDownload ? { attachment: true } : {},
  );
  const upstream = await axios.get(url, {
    responseType: 'stream',
    maxContentLength: 100 * 1024 * 1024,
  });

  res.setHeader('Content-Type', link.document.mimeType || upstream.headers['content-type'] || 'application/octet-stream');
  if (upstream.headers['content-length']) {
    res.setHeader('Content-Length', upstream.headers['content-length']);
  }
  res.setHeader(
    'Content-Disposition',
    `${wantDownload ? 'attachment' : 'inline'}; filename="${safeName(link.document.name)}"`,
  );
  upstream.data.pipe(res);
};
