import archiver from 'archiver';
import axios from 'axios';
import { PDFDocument } from 'pdf-lib';
import Document from '../models/Document.js';
import Vault from '../models/Vault.js';
import ActivityLog from '../models/ActivityLog.js';
import { getVaultRole } from '../utils/vaultAccess.js';
import { signedDownloadUrlForDocument } from '../utils/cloudinaryDownload.js';

function signedUrlFor(doc, ttlSeconds = 300) {
  return signedDownloadUrlForDocument(doc, ttlSeconds, { attachment: true }).url;
}

async function fetchDocBytes(doc) {
  const url = signedUrlFor(doc, 300);
  const resp = await axios.get(url, { responseType: 'arraybuffer', maxContentLength: 50 * 1024 * 1024 });
  return Buffer.from(resp.data);
}

async function loadOwnedDocs(ids, userId) {
  const docs = await Document.find({ _id: { $in: ids }, deletedAt: null });
  if (docs.length === 0) return { error: { status: 404, message: 'No documents found' } };
  const vaultIds = [...new Set(docs.map((d) => d.vault.toString()))];
  const roles = await Promise.all(
    vaultIds.map((vId) => getVaultRole(vId, userId).then((r) => [vId, r.role]))
  );
  const roleMap = Object.fromEntries(roles);
  for (const d of docs) {
    if (!roleMap[d.vault.toString()]) {
      return { error: { status: 403, message: 'You do not have access to one of the selected documents' } };
    }
  }
  return { docs, roleMap };
}

function safeName(name) {
  return String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 180);
}

export const zip = async (req, res) => {
  const ids = Array.isArray(req.body?.documentIds) ? req.body.documentIds : [];
  if (!ids.length) return res.status(400).json({ message: 'documentIds is required' });
  if (ids.length > 100) return res.status(400).json({ message: 'Maximum 100 files per export' });

  const { docs, roleMap, error } = await loadOwnedDocs(ids, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  const vaults = await Vault.find({ _id: { $in: Object.keys(roleMap) } });
  const vaultMap = Object.fromEntries(vaults.map((v) => [v._id.toString(), v]));
  for (const d of docs) {
    const role = roleMap[d.vault.toString()];
    const v = vaultMap[d.vault.toString()];
    if (role === 'viewer' && v && !v.allowViewerDownload) {
      return res.status(403).json({ message: 'One of the selected vaults does not allow viewer downloads' });
    }
  }

  const filename = `ferry-export-${Date.now()}.zip`;
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const archive = archiver('zip', { zlib: { level: 6 } });
  archive.on('error', (err) => {
    console.error('ZIP error', err);
    if (!res.headersSent) res.status(500).json({ message: 'Export failed' });
    else res.end();
  });
  archive.pipe(res);

  const used = new Set();
  for (const d of docs) {
    let entry = safeName(d.name);
    let i = 1;
    while (used.has(entry)) {
      const dot = entry.lastIndexOf('.');
      entry = dot > 0 ? `${entry.slice(0, dot)} (${i})${entry.slice(dot)}` : `${entry} (${i})`;
      i++;
    }
    used.add(entry);
    try {
      const url = signedUrlFor(d, 300);
      const resp = await axios.get(url, { responseType: 'stream' });
      archive.append(resp.data, { name: entry });
    } catch (e) {
      console.error('Failed to fetch for ZIP', d._id, e.message);
    }
  }

  await ActivityLog.create({
    user: req.user._id,
    action: 'export_zip',
    target: ids.join(','),
    meta: { count: docs.length },
    ip: req.ip,
  });

  await archive.finalize();
};

export const toPdf = async (req, res) => {
  const ids = Array.isArray(req.body?.documentIds) ? req.body.documentIds : [];
  const outName = safeName(req.body?.name || 'ferry-document') + '.pdf';
  if (!ids.length) return res.status(400).json({ message: 'documentIds is required' });
  if (ids.length > 30) return res.status(400).json({ message: 'Maximum 30 files per conversion' });

  const { docs, error } = await loadOwnedDocs(ids, req.user._id);
  if (error) return res.status(error.status).json({ message: error.message });

  for (const d of docs) {
    const { role } = await getVaultRole(d.vault, req.user._id);
    if (role !== 'editor') {
      return res.status(403).json({ message: 'Editor access required to convert documents' });
    }
  }

  const docsById = Object.fromEntries(docs.map((d) => [d._id.toString(), d]));
  const ordered = ids.map((id) => docsById[id]).filter(Boolean);

  const out = await PDFDocument.create();

  for (const d of ordered) {
    const mt = (d.mimeType || '').toLowerCase();
    try {
      if (mt === 'application/pdf') {
        const bytes = await fetchDocBytes(d);
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else if (mt === 'image/jpeg' || mt === 'image/jpg' || mt === 'image/png') {
        const bytes = await fetchDocBytes(d);
        const img = mt === 'image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const A4 = { w: 595.28, h: 841.89 };
        const ratio = Math.min(A4.w / img.width, A4.h / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        const page = out.addPage([A4.w, A4.h]);
        page.drawImage(img, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
      } else {
        return res.status(400).json({
          message: `Unsupported file type for PDF conversion: ${d.name} (${mt}). Convert DOCX to PDF first.`,
        });
      }
    } catch (e) {
      console.error('PDF convert failed for', d._id, e);
      return res.status(500).json({ message: `Failed to process "${d.name}"` });
    }
  }

  const pdfBytes = await out.save();

  await ActivityLog.create({
    user: req.user._id,
    action: 'export_pdf',
    target: ids.join(','),
    meta: { count: docs.length, name: outName },
    ip: req.ip,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${outName}"`);
  res.setHeader('Content-Length', pdfBytes.length);
  res.end(Buffer.from(pdfBytes));
};
