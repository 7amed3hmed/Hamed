import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from './models/User';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/authRoutes';
import internshipRoutes from './routes/internshipRoutes';
import applicationRoutes from './routes/applicationRoutes';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import notificationRoutes from './routes/notificationRoutes';
import supportRoutes from './routes/supportRoutes';
import volunteerRoutes from './routes/volunteerRoutes';
import recommendationRoutes from './routes/recommendationRoutes';



const app: Express = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
const dbUri = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inpalce2') as string;
const maskMongoUri = (uri: string): string => {
  try {
    return uri.replace(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1****:****@');
  } catch {
    return 'hidden';
  }
};
console.log(`Attempting to connect to MongoDB at: ${maskMongoUri(dbUri)}`);

mongoose.connect(dbUri)
  .then(async () => {
    console.log('Connected to Database successfully');
    
    // Auto-seed admin user
    try {
      const adminExists = await User.findOne({ email: 'admin@interno.com' });
      if (!adminExists) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        await User.create({
          email: 'admin@interno.com',
          password: hashedPassword,
          role: 'admin',
          isVerified: true,
          username: 'Super Admin',
        });
        console.log('Admin user seeded (admin@interno.com / admin123)');
      }
    } catch (err) {
      console.error('Failed to seed admin:', err);
    }
  })
  .catch((err) => {
    console.error(`Failed to connect to Database at ${maskMongoUri(dbUri)}:`, err);
    console.error('MongoDB is not running. Start MongoDB locally or set MONGODB_URI to MongoDB Atlas.');
    process.exit(1);
  });

// Keep _id in serialized output AND add 'id' as a string alias.
// Do NOT delete _id — backend controllers rely on _id for ObjectId comparisons.
mongoose.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
    }
    // Strip sensitive fields universally
    delete ret.password;
    delete ret.verificationCode;
    delete ret.otpExpiresAt;
  }
});

mongoose.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (_doc: any, ret: any) => {
    if (ret._id) {
      ret.id = ret._id.toString();
    }
    delete ret.password;
    delete ret.verificationCode;
    delete ret.otpExpiresAt;
  }
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 min — sufficient for active dev + polling
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Make uploads folder accessible statically
import path from 'path';
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.join(process.cwd(), 'uploads'))
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    message: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
