import { Router } from 'express';
import { signup, verifyEmail, resendOtp, login, getProfile, updateProfile } from '../controllers/authController';
import { protect } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (jpg, jpeg, png, gif, webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB size limit
  fileFilter
});

router.post('/signup', signup);
router.post('/resend-otp', resendOtp);
router.post('/verify-email', verifyEmail);
router.post('/login', login);

router.get('/profile', protect, getProfile);

// Wrap multer execution to catch and respond with 400 Bad Request on validation error
router.put('/profile', protect, (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        data: null,
        message: err.message
      });
    }
    next();
  });
}, updateProfile);

export default router;
