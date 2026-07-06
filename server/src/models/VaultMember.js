import mongoose from 'mongoose';

const vaultMemberSchema = new mongoose.Schema(
  {
    vault: { type: mongoose.Schema.Types.ObjectId, ref: 'Vault', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['viewer'], default: 'viewer' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vaultMemberSchema.index({ vault: 1, user: 1 }, { unique: true });

export default mongoose.model('VaultMember', vaultMemberSchema);
