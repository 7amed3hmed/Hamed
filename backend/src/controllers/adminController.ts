import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth';
import User from '../models/User';
import Application from '../models/Application';
import Internship from '../models/Internship';
import Notification from '../models/Notification';
import { sendSuccess, sendError } from '../utils/responseWrapper';
import { createNotification } from './notificationController';

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    return sendSuccess(res, 200, students, 'Volunteers fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const companies = await User.find({ role: 'company' }).select('-password');
    return sendSuccess(res, 200, companies, 'Organizations fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getPendingCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const companies = await User.find({ role: 'company', isApproved: false }).select('-password').sort({ createdAt: -1 });
    return sendSuccess(res, 200, companies, 'Pending organizations fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const approveCompany = async (req: AuthRequest, res: Response) => {
  try {
    const company = await User.findById(req.params.id);
    if (!company || company.role !== 'company') return sendError(res, 404, 'Organization not found');

    company.isApproved = true;
    await company.save();
    return sendSuccess(res, 200, company, 'Organization approved successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const rejectCompany = async (req: AuthRequest, res: Response) => {
  try {
    const company = await User.findById(req.params.id);
    if (!company || company.role !== 'company') return sendError(res, 404, 'Organization not found');

    company.isApproved = false;
    await company.save();
    return sendSuccess(res, 200, company, 'Organization access revoked');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const suspendUser = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found');

    user.isVerified = false;
    await user.save();
    return sendSuccess(res, 200, user, 'User suspended successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const deleteUserCascade = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) return;

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    if (user.role === 'student') {
      // 1. collect application IDs
      const apps = await Application.find({ studentId: userId }).session(session);
      const appIds = apps.map(app => app._id.toString());

      // 2. delete notifications
      await Notification.deleteMany({
        $or: [
          { recipientId: userId },
          { senderId: userId },
          { relatedType: 'application', relatedId: { $in: appIds } }
        ]
      }).session(session);

      // 3. delete applications
      await Application.deleteMany({ studentId: userId }).session(session);

      // 4. delete bookmarks (savedOpportunities) - stored in student document itself and deleted in step 7

      // 5. invalidate caches - no DB cache exists, log cache invalidation
      console.log(`[Cache Invalidation] Invalidate recommendation cache for student: ${userId}`);

      // 6. cleanup references - no other database tables refer to studentId

      // 7. delete user
      await User.findByIdAndDelete(userId).session(session);
    } else if (user.role === 'company') {
      const internships = await Internship.find({ companyId: userId }).session(session);
      const internshipIds = internships.map(i => i._id.toString());

      const apps = await Application.find({ internshipId: { $in: internshipIds } }).session(session);
      const appIds = apps.map(app => app._id.toString());

      await Notification.deleteMany({
        $or: [
          { recipientId: userId },
          { senderId: userId },
          { relatedType: 'opportunity', relatedId: { $in: internshipIds } },
          { relatedType: 'application', relatedId: { $in: appIds } }
        ]
      }).session(session);

      await Application.deleteMany({ internshipId: { $in: internshipIds } }).session(session);
      await Internship.deleteMany({ companyId: userId }).session(session);
      await User.findByIdAndDelete(userId).session(session);
    } else {
      await User.findByIdAndDelete(userId).session(session);
    }

    await session.commitTransaction();
  } catch (error: any) {
    await session.abortTransaction();
    
    // Fallback for local standalone MongoDB deployment without replica sets
    const isTransError = error.message.includes('replica set') || error.message.includes('transaction');
    if (isTransError) {
      console.warn('[Transactions] Standalone MongoDB detected. Falling back to non-transactional cascade delete.');
      
      if (user.role === 'student') {
        const apps = await Application.find({ studentId: userId });
        const appIds = apps.map(app => app._id.toString());

        await Notification.deleteMany({
          $or: [
            { recipientId: userId },
            { senderId: userId },
            { relatedType: 'application', relatedId: { $in: appIds } }
          ]
        });
        await Application.deleteMany({ studentId: userId });
        await User.findByIdAndDelete(userId);
      } else if (user.role === 'company') {
        const internships = await Internship.find({ companyId: userId });
        const internshipIds = internships.map(i => i._id.toString());

        const apps = await Application.find({ internshipId: { $in: internshipIds } });
        const appIds = apps.map(app => app._id.toString());

        await Notification.deleteMany({
          $or: [
            { recipientId: userId },
            { senderId: userId },
            { relatedType: 'opportunity', relatedId: { $in: internshipIds } },
            { relatedType: 'application', relatedId: { $in: appIds } }
          ]
        });
        await Application.deleteMany({ internshipId: { $in: internshipIds } });
        await Internship.deleteMany({ companyId: userId });
        await User.findByIdAndDelete(userId);
      } else {
        await User.findByIdAndDelete(userId);
      }
    } else {
      throw error;
    }
  } finally {
    session.endSession();
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    await deleteUserCascade(req.params.id as string);
    return sendSuccess(res, 200, null, 'User deleted successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// === Opportunity (Internship) Approval ===

export const getPendingOpportunities = async (req: AuthRequest, res: Response) => {
  try {
    const opportunities = await Internship.find({ 
      $or: [
        { status: 'pending' },
        { status: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });
    return sendSuccess(res, 200, opportunities, 'Pending opportunities fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const approveOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const opportunity = await Internship.findById(req.params.id);
    if (!opportunity) return sendError(res, 404, 'Opportunity not found');

    opportunity.status = 'approved';
    await opportunity.save();

    // Notify the organization
    await createNotification({
      recipientId: opportunity.companyId.toString(),
      recipientRole: 'company',
      type: 'opportunity_approved',
      title: '✅ Opportunity Approved',
      message: `Your opportunity "${opportunity.title}" has been approved and is now visible to volunteers.`,
      relatedId: (opportunity._id as any).toString(),
      relatedType: 'opportunity',
    });

    return sendSuccess(res, 200, opportunity, 'Opportunity approved and is now publicly visible');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const rejectOpportunity = async (req: AuthRequest, res: Response) => {
  try {
    const opportunity = await Internship.findById(req.params.id);
    if (!opportunity) return sendError(res, 404, 'Opportunity not found');

    opportunity.status = 'rejected';
    await opportunity.save();

    // Notify the organization
    await createNotification({
      recipientId: opportunity.companyId.toString(),
      recipientRole: 'company',
      type: 'opportunity_rejected',
      title: 'Opportunity Not Approved',
      message: `Your opportunity "${opportunity.title}" was not approved. Please review and resubmit.`,
      relatedId: (opportunity._id as any).toString(),
      relatedType: 'opportunity',
    });

    return sendSuccess(res, 200, opportunity, 'Opportunity rejected');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

// Admin stats overview
export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const [totalVolunteers, totalOrganizations, pendingOrganizations, pendingOpportunities, totalApplications, totalOpportunities] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'company' }),
      User.countDocuments({ role: 'company', isApproved: false }),
      Internship.countDocuments({ 
        $or: [
          { status: 'pending' },
          { status: { $exists: false } }
        ]
      }),
      Application.countDocuments(),
      Internship.countDocuments({ status: 'approved' }),
    ]);

    return sendSuccess(res, 200, {
      totalVolunteers,
      totalOrganizations,
      pendingOrganizations,
      pendingOpportunities,
      totalApplications,
      totalOpportunities,
    }, 'Admin stats fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};
