import mongoose from 'mongoose';

const vaultSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 500 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    icon: { type: String, default: 'folder', maxlength: 32 },
    color: { type: String, default: 'blue', maxlength: 16 },
    allowViewerDownload: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Vault', vaultSchema);
