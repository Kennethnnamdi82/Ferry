import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vault: { type: mongoose.Schema.Types.ObjectId, ref: 'Vault', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 1000 },
    category: {
      type: String,
      enum: ['Identity', 'Education', 'Property', 'Medical', 'Financial', 'Other'],
      default: 'Other',
      index: true,
    },
    tags: [{ type: String, trim: true, maxlength: 30 }],
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storageProvider: { type: String, enum: ['cloudinary', 's3'], default: 'cloudinary' },
    storageKey: { type: String, required: true },
    url: { type: String, required: true },
    flagged: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);
