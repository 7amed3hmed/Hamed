export type UserRole = 'student' | 'company' | 'admin';

export interface AssessmentResponse {
  questionId: string;
  question: string;
  category: string;
  score: number; // 1-5
}

export interface PersonalitySnapshot {
  trait: string;
  score: number;
}

export interface User {
  id: string;
  _id?: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

export interface StudentProfile extends User {
  role: 'student';
  username: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  profileImage?: string;
  cvUrl?: string;
  skills: string[];
  extractedSkills: string[];
  // Onboarding & personality
  hasCompletedOnboarding: boolean;
  onboardingStep?: number;
  interests?: string[];
  availability?: 'weekdays' | 'weekends' | 'both' | 'flexible';
  softSkillsAssessment?: AssessmentResponse[];
  personalityAssessment?: AssessmentResponse[];
  savedOpportunities?: string[];
  experienceYears?: number;
}

// Alias: Volunteer = Student
export type VolunteerProfile = StudentProfile;

export interface CompanyProfile extends User {
  role: 'company';
  companyName: string;
  industry?: string;
  phone?: string;
  taxRegister?: string;
  description?: string;
  logo?: string;
  isApproved: boolean;
}

// Alias: Organization = Company
export type OrganizationProfile = CompanyProfile;

export interface AdminProfile extends User {
  role: 'admin';
  username: string;
}

export type AppUser = StudentProfile | CompanyProfile | AdminProfile;

// Opportunity (was Internship)
export interface Opportunity {
  id: string;
  _id?: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  title: string;
  description: string;
  requiredSkills: string[];
  duration: string;
  isPaid: boolean;
  salaryMin?: number;
  salaryMax?: number;
  mode: 'online' | 'offline' | 'hybrid';
  city?: string;
  location?: string;
  category?: string;
  volunteerHours: number;
  seatsAvailable: number;
  applicationDeadline: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  exam?: Assessment;
  matchScore?: number | null;
  matchReason?: string;
}


// Alias for backward compat
export type Internship = Opportunity;

export interface Assessment {
  id: string;
  internshipId: string;
  questions: AssessmentQuestion[];
  duration: number; // minutes
}

// Alias
export type Exam = Assessment;

export interface AssessmentQuestion {
  id: string;
  question: string;
  choices: string[];
  correctAnswer: number;
  weight: number;
}

// Alias
export type ExamQuestion = AssessmentQuestion;

export interface Application {
  id: string;
  _id?: string;
  internshipId: string;
  internshipTitle: string;
  companyName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  studentGender?: string;
  cvUrl?: string;
  skills: string[];
  examScore?: number;
  examTimeTaken?: number;
  status: 'pending' | 'accepted' | 'rejected';
  appliedAt: string;
  acceptedAt?: string;
  hoursEarned: number;
  skillMatch?: number;
  softSkillsSnapshot?: PersonalitySnapshot[];
  personalitySnapshot?: PersonalitySnapshot[];
  compatibilityScore?: number;
}

// Onboarding question definitions (frontend-managed)
export interface OnboardingQuestion {
  id: string;
  text: string;
  category: string;
}

export const SOFT_SKILLS_QUESTIONS: OnboardingQuestion[] = [
  { id: 'ss1', text: 'You complete things methodically without skipping steps', category: 'Conscientiousness' },
  { id: 'ss2', text: 'Your work style is more spontaneous than organized', category: 'Spontaneity' },
  { id: 'ss3', text: 'You avoid leadership roles in group settings', category: 'Leadership' },
  { id: 'ss4', text: 'You try to understand different perspectives', category: 'Empathy' },
  { id: 'ss5', text: 'You stay calm under pressure', category: 'Resilience' },
  { id: 'ss6', text: 'You enjoy group activities', category: 'Teamwork' },
  { id: 'ss7', text: 'You find networking with strangers difficult', category: 'Networking' },
  { id: 'ss8', text: 'You rely more on emotions than facts', category: 'Emotional Reasoning' },
];

export const PERSONALITY_QUESTIONS: OnboardingQuestion[] = [
  { id: 'p1', text: 'I like experimenting with new ideas', category: 'Openness' },
  { id: 'p2', text: 'I feel discouraged easily', category: 'Neuroticism' },
  { id: 'p3', text: 'I feel energized around people', category: 'Extraversion' },
  { id: 'p4', text: 'I pay attention to details', category: 'Conscientiousness' },
  { id: 'p5', text: 'I track responsibilities carefully', category: 'Conscientiousness' },
  { id: 'p6', text: 'I start conversations easily', category: 'Extraversion' },
  { id: 'p7', text: 'I am cooperative and helpful', category: 'Agreeableness' },
  { id: 'p8', text: 'I follow schedules strictly', category: 'Conscientiousness' },
  { id: 'p9', text: 'I feel satisfied completing tasks efficiently', category: 'Conscientiousness' },
  { id: 'p10', text: 'I have a vivid imagination', category: 'Openness' },
  { id: 'p11', text: 'I double-check my work', category: 'Conscientiousness' },
  { id: 'p12', text: 'I avoid conflict when possible', category: 'Agreeableness' },
  { id: 'p13', text: 'I express my ideas clearly when speaking to others', category: 'Communication_Skills' },
  { id: 'p14', text: 'I feel confident presenting or explaining work to a group', category: 'Presentation_Skills' },
  { id: 'p15', text: 'I tend to worry a lot about things going wrong', category: 'Neuroticism' },
];

export const INTEREST_CATEGORIES = [
  { id: 'Frontend Development', label: '💻 Frontend Development', icon: '💻' },
  { id: 'Backend Development', label: '⚙️ Backend Development', icon: '⚙️' },
  { id: 'Database Development', label: '🗄️ Database Development', icon: '🗄️' },
];

export const SKILL_OPTIONS = [
  'React',
  'Node.js',
  'JavaScript',
  'TypeScript',
  'HTML',
  'CSS',
  'Tailwind CSS',
  'Express',
  'MongoDB',
  'MySQL',
  'PostgreSQL',
  'Python',
  'PHP',
  'Laravel',
  'Java',
  '.NET',
  'Oracle',
];
