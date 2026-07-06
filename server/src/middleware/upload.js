import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';
import { MAX_UPLOAD_BYTES } from '../config/uploadLimits.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: `vault/${req.user._id}`,
    resource_type: 'auto',
    type: 'authenticated',
    public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES },
});

export default upload;
