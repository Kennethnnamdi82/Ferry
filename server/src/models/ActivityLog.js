import mongoose from 'mongoose';

const logSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: {
      type: String,
      enum: [
        'register', 'login', 'logout',
        'upload', 'download', 'update', 'delete', 'restore', 'purge',
        'vault_create', 'vault_update', 'vault_delete',
        'invite', 'invite_accept', 'invite_remove',
        'share_create', 'share_revoke', 'share_view', 'share_download',
        'export_zip', 'export_pdf',
        'admin_action',
      ],
      required: true,
    },
    target: { type: String },
    meta: { type: Object, default: {} },
    ip: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('ActivityLog', logSchema);
