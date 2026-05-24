import mongoose, { Schema, Document } from 'mongoose';

export interface IPersonalitySnapshot {
  trait: string;
  score: number;
}

export interface IApplication extends Document {
  internshipId: mongoose.Types.ObjectId;
  internshipTitle: string;
  companyName: string;
  studentId: mongoose.Types.ObjectId;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentGender?: string;
  cvUrl?: string;
  skills: string[];
  examScore?: number;
  examTimeTaken?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'reviewing';
  skillMatch?: number;
  appliedAt: Date;
  acceptedAt?: Date;
  hoursEarned: number;
  // Personality data snapshot at time of application (for org viewing)
  softSkillsSnapshot?: IPersonalitySnapshot[];
  personalitySnapshot?: IPersonalitySnapshot[];
  compatibilityScore?: number; // Placeholder for future AI scoring
  matchScoreAtApply?: number;
  techScoreAtApply?: number;
  personalityScoreAtApply?: number;
}

const PersonalitySnapshotSchema = new Schema<IPersonalitySnapshot>({
  trait: { type: String, required: true },
  score: { type: Number, required: true },
});

const ApplicationSchema = new Schema<IApplication>({
  internshipId: { type: Schema.Types.ObjectId, ref: 'Internship', required: true },
  internshipTitle: { type: String, required: true },
  companyName: { type: String, required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  studentPhone: { type: String },
  studentGender: { type: String },
  cvUrl: { type: String },
  skills: { type: [String], default: [] },
  examScore: { type: Number },
  examTimeTaken: { type: Number },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'reviewing'], default: 'pending' },
  skillMatch: { type: Number, default: 0 },
  appliedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  hoursEarned: { type: Number, default: 0 },
  softSkillsSnapshot: { type: [PersonalitySnapshotSchema], default: [] },
  personalitySnapshot: { type: [PersonalitySnapshotSchema], default: [] },
  compatibilityScore: { type: Number, default: 0 },
  matchScoreAtApply: { type: Number },
  techScoreAtApply: { type: Number },
  personalityScoreAtApply: { type: Number },
}, { timestamps: true });

ApplicationSchema.index({ studentId: 1, internshipId: 1 }, { unique: true });

export default mongoose.model<IApplication>('Application', ApplicationSchema);
