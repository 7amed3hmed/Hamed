import { Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/responseWrapper';
import User from '../models/User';
import Internship from '../models/Internship';
import {
  buildRecommendationInput,
  normalizeTrack,
  normalizeSkills,
} from '../utils/recommendationUtils';

const PYTHON_TIMEOUT_MS = 15_000;
const SCRIPT_PATH = path.join(
  __dirname,
  '../../recommendation-system/recomendation_engine.py'
);

interface PythonRecommendation {
  opportunityId?: string;       // Present in dynamic per-opportunity mode
  programming_track?: string;
  required_language?: string;
  organization_name?: string;
  hybrid_score?: number;
  matchScore: number;
  techScore?: number;
  personalityScore?: number;
  matchReason?: string;
  recommendationSource?: string;
  userId?: string;              // For organization mode
}

interface PythonResult {
  success: boolean;
  recommendations?: PythonRecommendation[];
  message?: string;
  error?: string;
}

/** Call Python engine and parse stdout as JSON. */
function callPython(payload: object): Promise<PythonResult> {
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


// Debug flag — set DEBUG_RECOMMENDATION=1 in backend .env to enable verbose logs
const DEBUG_REC = process.env.DEBUG_RECOMMENDATION === '1';

/** Consistent response helper — always returns the same shape. */
function recResponse(
  res: Response,
  statusCode: number,
  opts: {
    success: boolean;
    recommendations: object[];
    needsProfileCompletion: boolean;
    message: string;
  }
) {
  return res.status(statusCode).json({
    success: opts.success,
    data: {
      recommendations:       opts.recommendations,
      needsProfileCompletion: opts.needsProfileCompletion,
    },
    message: opts.message,
  });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

export const getMyRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    // Load full user from DB to ensure all fields are present
    const user = await User.findById(req.user?._id).select(
      '-password -verificationCode -otpExpiresAt'
    );
    if (!user) return sendError(res, 401, 'User not found');

    // Only students get personalized recommendations
    if (user.role !== 'student') {
      return sendError(res, 403, 'Only students can access recommendations');
    }

    // Merge and normalize skills (aliases applied inside normalizeSkills)
    const mergedSkills = normalizeSkills([
      ...(user.skills ?? []),
      ...(user.extractedSkills ?? []),
    ]);

    // Check if onboarding is complete and skills exist
    if (!user.hasCompletedOnboarding || mergedSkills.length === 0) {
      return recResponse(res, 200, {
        success: true,
        recommendations: [],
        needsProfileCompletion: true,
        message: 'Complete your skills and personality profile to get personalized recommendations.',
      });
    }

    // ── Fetch real approved MongoDB opportunities to score individually ────
    const approvedInternships = await Internship.find({ status: 'approved' }).lean();

    if (approvedInternships.length === 0) {
      return recResponse(res, 200, {
        success: true,
        recommendations: [],
        needsProfileCompletion: false,
        message: 'No matching approved opportunities found.',
      });
    }

    // Build opportunities array — apply alias normalization to requiredSkills
    // so "postgres" matches "postgresql" in the TF-IDF space.
    const opportunities = approvedInternships.map((opp) => ({
      opportunityId:     String((opp as any)._id),
      title:             opp.title,
      required_language: normalizeSkills(opp.requiredSkills ?? []).join(', '),
      programming_track: normalizeTrack(opp.category ?? '') ?? 'Other',
      // Neutral personality defaults — opportunities don't store personality requirements
      Openness:            3,
      Conscientiousness:   3,
      Extraversion:        3,
      Agreeableness:       3,
      Neuroticism:         3,
      Communication_Skills:3,
      Presentation_Skills: 3,
    }));

    // Build student profile payload and attach the opportunities list
    const inputPayload  = buildRecommendationInput(user);
    const pythonPayload = { mode: 'student', ...inputPayload, opportunities };

    // ── Debug logs A & B — before calling Python ──────────────────────────────
    if (DEBUG_REC) {
      // A) User data sent to Python
      console.log('[Recommendations DEBUG] user id:', (user as any)._id);
      console.log('[Recommendations DEBUG] raw user skills:', user.skills);
      console.log('[Recommendations DEBUG] raw extracted skills:', user.extractedSkills);
      console.log('[Recommendations DEBUG] normalized language_skills:', inputPayload.language_skills);
      console.log('[Recommendations DEBUG] personality:', inputPayload.personality);
      // B) Opportunities sent to Python
      console.log('[Recommendations DEBUG] approved opportunities count:', approvedInternships.length);
      console.log('[Recommendations DEBUG] opportunities payload:', opportunities.map(o => ({
        opportunityId:     o.opportunityId,
        title:             o.title,
        programming_track: o.programming_track,
        required_language: o.required_language,
      })));
    }

    // Call Python — Python scores each opportunity individually
    const pythonResult = await callPython(pythonPayload);

    if (!pythonResult.success || !pythonResult.recommendations || pythonResult.recommendations.length === 0) {
      console.error('[Recommendations] Python returned no recommendations:', pythonResult.message ?? pythonResult.error);
      return recResponse(res, 200, {
        success: false,
        recommendations: [],
        needsProfileCompletion: false,
        message: 'Recommendation engine is currently unavailable.',
      });
    }

    // ── Debug log C — raw Python output ───────────────────────────────────────
    const pythonRecs = pythonResult.recommendations;
    if (DEBUG_REC) {
      console.log('[Recommendations DEBUG] raw Python results:', pythonRecs.map((r: any) => ({
        opportunityId:    r.opportunityId,
        title:            r.title,
        techScore:        r.techScore,
        personalityScore: r.personalityScore,
        matchScore:       r.matchScore,
        hybrid_score:     r.hybrid_score,
      })));
    }

    // Build a lookup map: opportunityId -> full Mongoose document
    const approvedMap = new Map(
      approvedInternships.map((opp) => [String((opp as any)._id), opp])
    );


    // ── Compatibility threshold filter — applied to raw Python results ─────────
    const MIN_TECH_SCORE  = 40;
    const MIN_MATCH_SCORE = 60;

    const compatibleRecs = pythonRecs.filter((rec: any) =>
      Number(rec.techScore  ?? 0) >= MIN_TECH_SCORE &&
      Number(rec.matchScore ?? 0) >= MIN_MATCH_SCORE
    );

    // ── Always-on logs D & E — print every request ───────────────────────────
    console.log(
      `[Recommendations] total scored: ${pythonRecs.length} | compatible (tech>=${MIN_TECH_SCORE} & match>=${MIN_MATCH_SCORE}): ${compatibleRecs.length}`
    );
    console.log(
      '[Recommendations] filtered out:',
      pythonRecs
        .filter((rec: any) => !compatibleRecs.some((c: any) => c.opportunityId === rec.opportunityId))
        .map((rec: any) => ({
          title:      rec.title,
          techScore:  rec.techScore,
          matchScore: rec.matchScore,
        }))
    );

    if (compatibleRecs.length === 0) {
      return recResponse(res, 200, {
        success: true,
        recommendations: [],
        needsProfileCompletion: false,
        message: 'No compatible opportunities found for your current skills.',
      });
    }

    // Map only compatible Python results to full MongoDB documents
    const mappedCompatibleRecs = compatibleRecs
      .map((rec: any) => {
        if (!rec.opportunityId) return null;
        const opp = approvedMap.get(rec.opportunityId);
        if (!opp) return null;
        return {
          _id:                 (opp as any)._id,
          title:               opp.title,
          description:         opp.description,
          companyName:         opp.companyName,
          companyLogo:         opp.companyLogo ?? null,
          category:            opp.category,
          requiredSkills:      opp.requiredSkills ?? [],
          volunteerHours:      opp.volunteerHours,
          mode:                opp.mode,
          city:                opp.city ?? null,
          location:            opp.location ?? null,
          seatsAvailable:      opp.seatsAvailable,
          isPaid:              opp.isPaid,
          salaryMin:           opp.salaryMin ?? null,
          salaryMax:           opp.salaryMax ?? null,
          applicationDeadline: opp.applicationDeadline,
          status:              opp.status,
          // All score fields come from Python — never overridden by backend
          matchScore:          rec.matchScore,
          techScore:           rec.techScore          ?? null,
          personalityScore:    rec.personalityScore   ?? null,
          hybrid_score:        rec.hybrid_score       ?? null,
          matchReason:         rec.matchReason        ?? null,
          recommendationSource: 'python-hybrid-model',
        };
      })
      .filter((item: any): item is NonNullable<typeof item> => item !== null);

    // ── Debug log F — verbose, behind DEBUG_REC flag ──────────────────────
    if (DEBUG_REC) {
      console.log('[Recommendations DEBUG] final mapped recommendations:', mappedCompatibleRecs.map((r: any) => ({
        _id:                 r._id,
        title:               r.title,
        techScore:           r.techScore,
        personalityScore:    r.personalityScore,
        matchScore:          r.matchScore,
        recommendationSource: r.recommendationSource,
      })));
    }

    return recResponse(res, 200, {
      success: true,
      recommendations: mappedCompatibleRecs,
      needsProfileCompletion: false,
      message: 'Recommendations fetched',
    });

  } catch (error: any) {
    console.error('[Recommendations] Controller error:', error.message);
    return sendError(res, 500, 'Failed to fetch recommendations');
  }
};

export const getTopVolunteersForOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    // Only companies/organizations can view top volunteer suggestions
    if (req.user?.role !== 'company' && req.user?.role !== 'admin') {
      return sendError(res, 403, 'Only companies/organizations can view top volunteer suggestions');
    }

    const { opportunityId } = req.params;
    if (!opportunityId) {
      return sendError(res, 400, 'Opportunity ID is required');
    }

    const opportunity = await Internship.findById(opportunityId);
    if (!opportunity) {
      return sendError(res, 404, 'Opportunity not found');
    }

    // Load active student users from MongoDB who completed onboarding
    const students = await User.find({
      role: 'student',
      hasCompletedOnboarding: true
    }).select('_id username email skills extractedSkills profileImage');

    if (students.length === 0) {
      return sendSuccess(res, 200, { recommendations: [] }, 'No volunteers found');
    }

    // Build the volunteers payload
    const volunteersPayload = students.map(student => {
      const merged = normalizeSkills([
        ...(student.skills ?? []),
        ...(student.extractedSkills ?? [])
      ]);
      return {
        userId: String(student._id),
        language_skills: merged.join(', ')
      };
    });

    const payload = {
      mode: 'organization',
      required_language: (opportunity.requiredSkills ?? []).join(', '),
      volunteers: volunteersPayload,
      limit: 10
    };

    console.log('[Recommendations] Python payload keys:', Object.keys(payload));

    // Call Python
    const pythonResult = await callPython(payload);

    if (!pythonResult.success || !pythonResult.recommendations) {
      return res.status(200).json({
        success: false,
        recommendations: [],
        message: 'Recommendation engine is currently unavailable.'
      });
    }

    // Map scoring results to student profiles
    const scoredStudents = pythonResult.recommendations.map(rec => {
      const studentInfo = students.find(s => String(s._id) === rec.userId);
      if (!studentInfo) return null;

      return {
        _id: studentInfo._id,
        username: studentInfo.username,
        email: studentInfo.email,
        profileImage: studentInfo.profileImage ?? null,
        skills: studentInfo.skills ?? [],
        extractedSkills: studentInfo.extractedSkills ?? [],
        matchScore: rec.matchScore
      };
    }).filter(Boolean);

    return sendSuccess(res, 200, {
      recommendations: scoredStudents
    }, 'Top volunteers fetched');

  } catch (error: any) {
    console.error('[Recommendations] Organization matching error:', error.message);
    return sendError(res, 500, 'Failed to fetch volunteer matches');
  }
};
