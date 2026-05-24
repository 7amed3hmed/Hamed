import { Response } from 'express';
import Internship, { IInternship } from '../models/Internship';
import Application from '../models/Application';
import Notification from '../models/Notification';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/responseWrapper';
import User from '../models/User';
import { createNotification } from './notificationController';

export const getInternships = async (req: AuthRequest, res: Response) => {
  try {
    const filters: any = {};
    if (req.query.mode) filters.mode = req.query.mode;
    if (req.query.isPaid === 'true') filters.isPaid = true;
    if (req.query.category) filters.category = req.query.category;

    // Public listing — only show admin-approved opportunities
    const isCompany = req.user?.role === 'company';
    const isAdmin = req.user?.role === 'admin';
    if (!isCompany && !isAdmin) {
      filters.status = 'approved';
    }

    // Company can filter their own
    if (isCompany && req.query.companyId) {
      filters.companyId = req.query.companyId;
    }

    const internships = await Internship.find(filters)
      .populate('companyId', 'companyName logo')
      .sort({ createdAt: -1 })
      .lean();

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

    return sendSuccess(res, 200, enrichedInternships, 'Opportunities fetched successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

/**
 * GET /internships/mine
 * Returns all opportunities for the authenticated company regardless of status.
 * Used exclusively by the company dashboard and internship management pages.
 */
export const getMyInternships = async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req.user as any)?._id || (req.user as any)?.id;
    if (!companyId) return sendError(res, 401, 'Not authorized');
    const internships = await Internship.find({ companyId })
      .populate('companyId', 'companyName logo')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, internships, 'My opportunities fetched successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getInternshipById = async (req: AuthRequest, res: Response) => {
  try {
    const internship = await Internship.findById(req.params.id).populate('companyId', 'companyName logo');
    if (!internship) return sendError(res, 404, 'Internship not found');

    // Do not return exam correct answers
    if (internship.exam) {
      internship.exam.questions = internship.exam.questions.map(q => {
        const qObj = (q as any).toObject ? (q as any).toObject() : { ...q };
        delete qObj.correctAnswer;
        return qObj;
      }) as any;
    }

    const internshipObj: any = internship.toObject();

    if (req.user && req.user.role === 'student') {
      const application = await Application.findOne({ studentId: req.user._id, internshipId: req.params.id }).lean();
      internshipObj.hasApplied = !!application;
      internshipObj.applicationStatus = application?.status;
    }

    return sendSuccess(res, 200, internshipObj, 'Internship fetched successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const createInternship = async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, description, requiredSkills, duration, isPaid,
      salaryMin, salaryMax, mode, city, location, category, roleTitle,
      seatsAvailable, applicationDeadline, exam, volunteerHours
    } = req.body;

    const vh = Number(volunteerHours);
    if (!volunteerHours || !Number.isFinite(vh) || vh < 1) {
      return sendError(res, 400, 'Volunteer hours must be a positive number');
    }

    // Use _id from live Mongoose Document (never deleted by toJSON since this is the Document instance)
    const companyId = (req.user as any)?._id || (req.user as any)?.id;
    const companyName = req.user?.companyName || (req.user as any)?.companyName;

    if (!companyId) return sendError(res, 401, 'Not authorized');

    const internship = await Internship.create({
      companyId,
      companyName,
      companyLogo: req.user?.logo || (req.user as any)?.logo,
      title,
      description,
      requiredSkills,
      duration: duration || `${vh} hours`,
      isPaid,
      salaryMin,
      salaryMax,
      mode,
      city,
      location,
      category: category || 'Frontend Development',
      roleTitle: roleTitle || '',
      seatsAvailable,
      applicationDeadline,
      exam,
      volunteerHours: vh,
      status: 'pending',
    } as any);

    // Find admin(s) and notify them
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await createNotification({
        recipientId: String((admin as any)._id || (admin as any).id),
        recipientRole: 'admin',
        senderId: String(companyId),
        senderName: companyName,
        type: 'opportunity_submitted',
        title: 'New Opportunity Submitted',
        message: `${companyName} submitted a new opportunity: "${title}" for review.`,
        relatedId: String((internship as any)._id || (internship as any).id),
        relatedType: 'opportunity',
      });
    }

    return sendSuccess(res, 201, internship, 'Opportunity submitted for admin approval');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const updateInternship = async (req: AuthRequest, res: Response) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) return sendError(res, 404, 'Internship not found');

    const ownerId = String(internship.companyId);
    const requesterId = String((req.user as any)?._id || (req.user as any)?.id);
    if (ownerId !== requesterId) {
      return sendError(res, 403, 'Not authorized to update this internship');
    }

    if (req.body.volunteerHours !== undefined) {
      const vh = Number(req.body.volunteerHours);
      if (!Number.isFinite(vh) || vh < 1) {
        return sendError(res, 400, 'Volunteer hours must be a positive number');
      }
    }

    const updated = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return sendSuccess(res, 200, updated, 'Internship updated successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const deleteInternship = async (req: AuthRequest, res: Response) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship) return sendError(res, 404, 'Internship not found');

    const ownerId = String(internship.companyId);
    const requesterId = String((req.user as any)?._id || (req.user as any)?.id);
    const isAdmin = req.user?.role === 'admin';

    if (ownerId !== requesterId && !isAdmin) {
      return sendError(res, 403, 'Not authorized to delete this internship');
    }

    const internshipId = (internship as any)._id;

    // Pre-fetch related applications to cascade their notifications
    const apps = await Application.find({ internshipId });
    const appIds = apps.map(app => String((app as any)._id || (app as any).id));

    // Cascade: remove all related applications
    await Application.deleteMany({ internshipId });

    // Cascade: remove all notifications related to this opportunity OR its applications
    await Notification.deleteMany({
      $or: [
        { relatedId: internshipId.toString(), relatedType: 'opportunity' },
        { relatedId: { $in: appIds }, relatedType: 'application' }
      ]
    });

    await internship.deleteOne();
    return sendSuccess(res, 200, null, 'Internship and all related data deleted successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getExam = async (req: AuthRequest, res: Response) => {
  try {
    const internship = await Internship.findById(req.params.id);
    if (!internship || !internship.exam) return sendError(res, 404, 'Exam not found');

    const sanitizedQuestions = internship.exam.questions.map(q => {
      const { correctAnswer, ...rest } = (q as any).toObject ? (q as any).toObject() : { ...q };
      return rest;
    });

    return sendSuccess(res, 200, {
      duration: internship.exam.duration,
      questions: sanitizedQuestions
    }, 'Exam fetched successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};
