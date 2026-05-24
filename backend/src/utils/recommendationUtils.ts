import { IAssessmentResponse, IUser } from '../models/User';
import { spawn } from 'child_process';
import path from 'path';

// ─── Personality aggregation ────────────────────────────────────────────────

const PERSONALITY_TRAITS = [
  'Openness',
  'Conscientiousness',
  'Extraversion',
  'Agreeableness',
  'Neuroticism',
  'Communication_Skills',
  'Presentation_Skills',
  'Leadership',
  'Teamwork',
  'Resilience',
  'Networking',
  'Emotional_Reasoning',
  'Empathy',
  'Spontaneity',
] as const;

type PersonalityVector = Record<(typeof PERSONALITY_TRAITS)[number], number>;

/**
 * Averages raw AssessmentResponse[] entries by category.
 * Missing categories default to neutral 3. Values clamped to [1, 5].
 */
export function aggregatePersonality(
  assessment: IAssessmentResponse[] | undefined
): PersonalityVector {
  const groups: Record<string, number[]> = {};

  for (const resp of assessment ?? []) {
    let cat = resp.category?.trim();
    if (!cat) continue;
    if (cat === 'Emotional Reasoning') {
      cat = 'Emotional_Reasoning';
    }
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(resp.score);
  }

  const result = {} as PersonalityVector;
  for (const trait of PERSONALITY_TRAITS) {
    const scores = groups[trait];
    if (scores && scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      result[trait] = Math.min(5, Math.max(1, avg));
    } else {
      result[trait] = 3; // neutral fallback
    }
  }
  return result;
}

// ─── Track normalization ────────────────────────────────────────────────────

const APP_TO_PYTHON: Record<string, string> = {
  'frontend development':  'Front_end',
  'backend development':   'Back_end',
  'database development':  'Database',
  'ui/ux design':          'UI_UX',
  'mobile development':    'Mobile',
  'data analysis':         'Data_Analysis',
  'cybersecurity':         'Cybersecurity',
  'other':                 'Other',
};

const PYTHON_TO_APP: Record<string, string> = {
  front_end:    'Frontend Development',
  back_end:     'Backend Development',
  database:     'Database Development',
  ui_ux:        'UI/UX Design',
  mobile:       'Mobile Development',
  data_analysis:'Data Analysis',
  cybersecurity:'Cybersecurity',
  other:        'Other',
};

/**
 * Converts an app category label to a Python track string.
 * Returns null for unknown labels — never defaults to Front_end.
 */
export function normalizeTrack(label: string): string | null {
  if (!label) return null;
  return APP_TO_PYTHON[label.trim().toLowerCase()] ?? null;
}

/**
 * Converts a Python track string back to the app category label.
 * Returns null for unknown tracks.
 */
export function denormalizeTrack(track: string): string | null {
  if (!track) return null;
  return PYTHON_TO_APP[track.trim().toLowerCase()] ?? null;
}

// ─── Skill normalization ────────────────────────────────────────────────────

/**
 * Skill alias map — maps common shorthand/misspellings to canonical forms.
 * Applied after lowercasing so all keys must be lowercase.
 */
const SKILL_ALIASES: Record<string, string> = {
  postgl:      'postgresql',
  postgres:    'postgresql',
  postgre:     'postgresql',
  mongo:       'mongodb',
  js:          'javascript',
  ts:          'typescript',
  node:        'node.js',
  nodejs:      'node.js',
  expressjs:   'express',
  tailwind:    'tailwind css',
};

/**
 * Trims, applies alias normalization, deduplicates (case-insensitively), and removes empty strings.
 * Canonical alias values are always used (e.g. "postgl" becomes "postgresql").
 */
export function normalizeSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const s of skills) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    const lower   = trimmed.toLowerCase();
    // Apply alias if one exists, otherwise keep trimmed original
    const canonical = SKILL_ALIASES[lower] ?? trimmed;
    const key       = canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(canonical);
    }
  }
  return result;
}

// ─── Recommendation input builder ───────────────────────────────────────────

export interface RecommendationInput {
  skills: string[];
  language_skills: string;
  interests: string[];
  preferredTracks: string[];
  experienceYears: number;
  personality: PersonalityVector;
  limit: number;
}

/**
 * Builds a safe JSON-serializable payload for the Python engine.
 * Merges user.skills + user.extractedSkills, normalizes, deduplicates.
 * Excludes ALL private/auth fields.
 */
export function buildRecommendationInput(user: IUser): RecommendationInput {
  // Merge and deduplicate skills
  const raw = [...(user.skills ?? []), ...(user.extractedSkills ?? [])];
  const skills = normalizeSkills(raw);

  // Convert skills array to language_skills comma-separated string
  const language_skills = skills.join(', ');

  // Convert interest labels to Python track codes (drop unknown)
  const preferredTracks = (user.interests ?? [])
    .map(normalizeTrack)
    .filter((t): t is string => t !== null);

  const mergedAssessments = [
    ...(user.personalityAssessment ?? []),
    ...(user.softSkillsAssessment ?? []),
  ];
  const personality = aggregatePersonality(mergedAssessments);

  return {
    skills,
    language_skills,
    interests: user.interests ?? [],
    preferredTracks,
    experienceYears: user.experienceYears ?? 0,
    personality,
    limit: 10,
  };
}

const PYTHON_TIMEOUT_MS = 15_000;
const SCRIPT_PATH = path.join(
  __dirname,
  '../../recommendation-system/recomendation_engine.py'
);

export interface PythonRecommendation {
  opportunityId?: string;
  programming_track?: string;
  required_language?: string;
  organization_name?: string;
  hybrid_score?: number;
  matchScore: number;
  techScore?: number;
  effectiveTechScore?: number;
  personalityScore?: number;
  matchReason?: string;
  recommendationSource?: string;
  userId?: string;
}

export interface PythonResult {
  success: boolean;
  recommendations?: PythonRecommendation[];
  message?: string;
  error?: string;
}

/** Call Python engine and parse stdout as JSON. */
export function callPython(payload: object): Promise<PythonResult> {
  return new Promise((resolve) => {
    const pythonBin = process.env.PYTHON_BIN || 'python';
    const inputJson = JSON.stringify(payload);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn(pythonBin, [SCRIPT_PATH, inputJson]);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      resolve({ success: false, message: 'Python process timed out', error: 'timeout' });
    }, PYTHON_TIMEOUT_MS);

    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) return;

      if (stderr.trim()) {
        console.error('[Recommendations] Python stderr:', stderr.trim().substring(0, 1000));
      }

      if (code !== 0) {
        console.error(`[Recommendations] Python exited with code ${code}`);
        resolve({ success: false, message: 'Python process failed', error: `exit code ${code}` });
        return;
      }

      try {
        const parsed = JSON.parse(stdout.trim()) as PythonResult;
        resolve(parsed);
      } catch {
        console.error('[Recommendations] Failed to parse Python stdout:', stdout.substring(0, 500));
        resolve({ success: false, message: 'Invalid Python output', error: 'json parse failure' });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      console.error('[Recommendations] Spawn error:', err.message);
      resolve({ success: false, message: 'Failed to start Python', error: err.message });
    });
  });
}

/** Scores a single opportunity using the Python recommendation engine. */
export async function getOpportunityMatchScore(
  user: IUser,
  internship: any
): Promise<{ matchScore: number; techScore: number; effectiveTechScore?: number; personalityScore: number } | null> {
  try {
    const mergedSkills = normalizeSkills([
      ...(user.skills ?? []),
      ...(user.extractedSkills ?? []),
    ]);

    // If onboarding is not completed or no skills, we cannot calculate recommendation scores.
    if (!user.hasCompletedOnboarding || mergedSkills.length === 0) {
      return null;
    }

    const opportunities = [{
      opportunityId:     String(internship._id),
      title:             internship.title,
      required_language: normalizeSkills(internship.requiredSkills ?? []).join(', '),
      programming_track: normalizeTrack(internship.category ?? '') ?? 'Other',
      Openness:            3,
      Conscientiousness:   3,
      Extraversion:        3,
      Agreeableness:       3,
      Neuroticism:         3,
      Communication_Skills:3,
      Presentation_Skills: 3,
    }];

    const inputPayload  = buildRecommendationInput(user);
    const pythonPayload = { mode: 'student', ...inputPayload, opportunities };

    const pythonResult = await callPython(pythonPayload);

    if (pythonResult.success && pythonResult.recommendations && pythonResult.recommendations.length > 0) {
      const rec = pythonResult.recommendations[0];

      // Safeguard: Ensure scores are valid, normalized, and clamped within [0, 100]
      const matchScore = Math.max(0, Math.min(100, Math.round(rec.matchScore)));
      const techScore = Math.max(0, Math.min(100, Math.round(rec.techScore ?? 0)));
      const effectiveTechScore = Math.max(0, Math.min(100, Math.round(rec.effectiveTechScore ?? 0)));
      const personalityScore = Math.max(0, Math.min(100, Math.round(rec.personalityScore ?? 50)));

      return {
        matchScore,
        techScore,
        effectiveTechScore,
        personalityScore,
      };
    }
    return null;
  } catch (error) {
    console.error('[Recommendations] getOpportunityMatchScore error:', error);
    return null;
  }
}

