import mongoose from 'mongoose';

const shareLinkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true, index: true },
    allowDownload: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    maxViews: { type: Number, default: null },
    views: { type: Number, default: 0 },
    maxDownloads: { type: Number, default: null },
    downloads: { type: Number, default: 0 },
    passwordHash: { type: String, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('ShareLink', shareLinkSchema);
