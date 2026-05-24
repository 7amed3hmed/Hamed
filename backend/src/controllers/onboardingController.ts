import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/responseWrapper';
import User from '../models/User';
import Internship from '../models/Internship';
import Application from '../models/Application';

// Save soft skills assessment responses
export const saveSoftSkills = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return sendError(res, 404, 'User not found');

    const { responses } = req.body;
    // responses: Array<{ questionId, question, category, score }>
    if (!Array.isArray(responses) || responses.length === 0) {
      return sendError(res, 400, 'Assessment responses are required');
    }

    user.softSkillsAssessment = responses;
    user.onboardingStep = Math.max(user.onboardingStep || 0, 2);
    await user.save();

    return sendSuccess(res, 200, { softSkillsAssessment: user.softSkillsAssessment }, 'Soft skills assessment saved');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Save personality assessment responses
export const savePersonality = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return sendError(res, 404, 'User not found');

    const { responses } = req.body;
    if (!Array.isArray(responses) || responses.length === 0) {
      return sendError(res, 400, 'Assessment responses are required');
    }

    user.personalityAssessment = responses;
    user.onboardingStep = Math.max(user.onboardingStep || 0, 3);
    await user.save();

    return sendSuccess(res, 200, { personalityAssessment: user.personalityAssessment }, 'Personality assessment saved');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Save basic info (step 1)
export const saveBasicInfo = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return sendError(res, 404, 'User not found');

    const { interests, availability, phone, gender, username, skills, experienceYears } = req.body;

    if (username) user.username = username;
    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (interests) user.interests = interests;
    if (availability) user.availability = availability;

    // Validate and normalize skills
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return sendError(res, 400, 'Skills must be an array');
      }
      const normalized: string[] = [];
      const seen = new Set<string>();
      for (const s of skills) {
        const trimmed = String(s).trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          normalized.push(trimmed);
        }
      }
      if (normalized.length === 0) {
        return sendError(res, 400, 'At least one skill is required');
      }
      user.skills = normalized;
    }

    // Validate and save experienceYears
    if (experienceYears !== undefined) {
      const yrs = Number(experienceYears);
      if (isNaN(yrs) || yrs < 0) {
        return sendError(res, 400, 'experienceYears must be a number >= 0');
      }
      user.experienceYears = yrs;
    }

    user.onboardingStep = Math.max(user.onboardingStep || 0, 1);

    await user.save();
    return sendSuccess(res, 200, user, 'Basic info saved');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Mark onboarding as complete
export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return sendError(res, 404, 'User not found');

    user.hasCompletedOnboarding = true;
    user.onboardingStep = 4;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return sendSuccess(res, 200, userObj, 'Onboarding completed successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Get onboarding status
export const getOnboardingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select(
      'hasCompletedOnboarding onboardingStep interests availability softSkillsAssessment personalityAssessment'
    );
    if (!user) return sendError(res, 404, 'User not found');

    return sendSuccess(res, 200, {
      hasCompletedOnboarding: user.hasCompletedOnboarding || false,
      onboardingStep: user.onboardingStep || 0,
      interests: user.interests || [],
      availability: user.availability,
      softSkillsAssessment: user.softSkillsAssessment || [],
      personalityAssessment: user.personalityAssessment || [],
    }, 'Onboarding status fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Save / unsave an opportunity (bookmark)
export const toggleSavedOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) return sendError(res, 404, 'User not found');

    const opportunityId = req.params.opportunityId as string;
    if (!opportunityId) return sendError(res, 400, 'Opportunity ID is required');

    const saved: string[] = (user.savedOpportunities || []) as string[];
    const isSaved = saved.includes(opportunityId);

    if (isSaved) {
      user.savedOpportunities = saved.filter((id: string) => id !== opportunityId);
    } else {
      user.savedOpportunities = [...saved, opportunityId];
    }

    await user.save();
    
    return sendSuccess(res, 200, {
      saved: !isSaved,
      savedOpportunities: user.savedOpportunities,
    }, isSaved ? 'Opportunity removed from bookmarks' : 'Opportunity saved to bookmarks');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Get saved opportunities list with populated details
export const getSavedOpportunities = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('savedOpportunities');
    if (!user) return sendError(res, 404, 'User not found');

    // If we want to return full objects instead of just IDs
    const internships = await Internship.find({
      _id: { $in: user.savedOpportunities }
    }).populate('companyId', 'companyName logo').sort({ createdAt: -1 }).lean();

    let enrichedInternships: any[] = internships;
    if (req.user && req.user.role === 'student') {
      const studentApplications = await Application.find({ studentId: req.user._id }).lean();
      const appMap = new Map(studentApplications.map((app: any) => [app.internshipId.toString(), app.status]));
      enrichedInternships = internships.map(opp => {
        const oppId = String((opp as any)._id || (opp as any).id);
        return {
          ...opp,
          hasApplied: appMap.has(oppId),
          applicationStatus: appMap.get(oppId)
        };
      });
    }

    return sendSuccess(res, 200, { 
      savedOpportunityIds: user.savedOpportunities || [],
      savedOpportunities: enrichedInternships 
    }, 'Saved opportunities fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};
