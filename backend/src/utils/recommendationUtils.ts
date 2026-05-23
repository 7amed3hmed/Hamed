import { IAssessmentResponse, IUser } from '../models/User';

// ─── Personality aggregation ────────────────────────────────────────────────

const PERSONALITY_TRAITS = [
  'Openness',
  'Conscientiousness',
  'Extraversion',
  'Agreeableness',
  'Neuroticism',
  'Communication_Skills',
  'Presentation_Skills',
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
    const cat = resp.category?.trim();
    if (!cat) continue;
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

  const personality = aggregatePersonality(user.personalityAssessment);

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
