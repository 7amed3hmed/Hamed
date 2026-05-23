import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessmentResponse {
  questionId: string;
  question: string;
  category: string;
  score: number; // 1-5
}

export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'student' | 'company' | 'admin';
  isVerified: boolean;
  verificationCode?: string;
  otpExpiresAt?: Date;

  // Volunteer (Student) specific
  username?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  profileImage?: string;
  cvUrl?: string;
  skills?: string[];
  extractedSkills?: string[];

  // Volunteer onboarding & personality
  hasCompletedOnboarding?: boolean;
  onboardingStep?: number;
  interests?: string[];
  availability?: 'weekdays' | 'weekends' | 'both' | 'flexible';
  softSkillsAssessment?: IAssessmentResponse[];
  personalityAssessment?: IAssessmentResponse[];
  savedOpportunities?: string[];
  experienceYears?: number;

  // Organization (Company) specific
  companyName?: string;
  industry?: string;
  taxRegister?: string;
  description?: string;
  logo?: string;
  isApproved?: boolean;
}

const AssessmentResponseSchema = new Schema<IAssessmentResponse>({
  questionId: { type: String, required: true },
  question: { type: String, required: true },
  category: { type: String, required: true },
  score: { type: Number, required: true, min: 1, max: 5 },
});

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: String, enum: ['student', 'company', 'admin'], required: true },
  isVerified: { type: Boolean, default: false },
  verificationCode: { type: String },
  otpExpiresAt: { type: Date },

  // Volunteer fields
  username: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  phone: { type: String },
  profileImage: { type: String },
  cvUrl: { type: String },
  skills: { type: [String], default: [] },
  extractedSkills: { type: [String], default: [] },

  // Onboarding & personality fields
  hasCompletedOnboarding: { type: Boolean, default: false },
  onboardingStep: { type: Number, default: 0 },
  interests: { type: [String], default: [] },
  availability: { type: String, enum: ['weekdays', 'weekends', 'both', 'flexible'] },
  softSkillsAssessment: { type: [AssessmentResponseSchema], default: [] },
  personalityAssessment: { type: [AssessmentResponseSchema], default: [] },
  savedOpportunities: { type: [String], default: [] },
  experienceYears: { type: Number, default: 0, min: 0 },

  // Organization fields
  companyName: { type: String },
  industry: { type: String },
  taxRegister: { type: String },
  description: { type: String },
  logo: { type: String },
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
