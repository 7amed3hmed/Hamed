import { Response } from 'express';
import Application from '../models/Application';
import Internship from '../models/Internship';
import User from '../models/User';
import { AuthRequest } from '../middlewares/auth';
import { sendSuccess, sendError } from '../utils/responseWrapper';
import { createNotification } from './notificationController';
import { NotificationType } from '../models/Notification';
import { getOpportunityMatchScore } from '../utils/recommendationUtils';

export const submitExamAndApply = async (req: AuthRequest, res: Response) => {
  try {
    const { id: internshipId } = req.params;
    const { answers } = req.body;
    const user = req.user!;

    const internship = await Internship.findById(internshipId);
    if (!internship) return sendError(res, 404, 'Opportunity not found');

    const userId = (user as any)._id || (user as any).id;
    const hasApplied = await Application.findOne({ studentId: userId, internshipId });
    if (hasApplied) return sendError(res, 400, 'Already applied to this opportunity');

    let score = 0;
    let totalWeight = 0;
    let percentage = 0;

    if (internship.exam && internship.exam.questions.length > 0) {
      internship.exam.questions.forEach(q => {
        totalWeight += q.weight;
        const qId = (q as any)._id?.toString() || (q as any).id;
        if (answers && answers[qId] === q.correctAnswer) {
          score += q.weight;
        }
      });
      percentage = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
    }

    // Calculate skill match
    let matchCount = 0;
    const reqSkills = internship.requiredSkills || [];
    const userSkills = user.skills || [];
    if (reqSkills.length > 0) {
      reqSkills.forEach(sk => {
        if (userSkills.some(us => us.toLowerCase() === sk.toLowerCase())) matchCount++;
      });
    }
    const skillMatch = reqSkills.length > 0 ? Math.round((matchCount / reqSkills.length) * 100) : 0;

    // Build personality snapshots
    const softSkillsSnapshot = (user as any).softSkillsAssessment?.map((a: any) => ({
      trait: a.category,
      score: a.score,
    })) || [];
    const personalitySnapshot = (user as any).personalityAssessment?.map((a: any) => ({
      trait: a.category,
      score: a.score,
    })) || [];

    // Capture recommendation scores snapshot (failure/timeout must not block application lifecycle)
    let aiScores = null;
    try {
      aiScores = await getOpportunityMatchScore(user, internship);
    } catch (err) {
      console.error('[Application Creation] Failed to get AI compatibility scores snapshot:', err);
    }

    const application = await Application.create({
      internshipId: internshipId as string,
      internshipTitle: internship.title,
      companyName: internship.companyName,
      studentId: userId,
      studentName: user.username,
      studentEmail: user.email,
      studentPhone: user.phone,
      studentGender: user.gender,
      cvUrl: user.cvUrl,
      skills: user.skills,
      examScore: percentage,
      status: 'pending',
      skillMatch,
      softSkillsSnapshot,
      personalitySnapshot,
      compatibilityScore: 0,
      matchScoreAtApply: aiScores?.matchScore,
      techScoreAtApply: aiScores?.techScore,
      personalityScoreAtApply: aiScores?.personalityScore,
    });

    // Notify the organization
    await createNotification({
      recipientId: String(internship.companyId),
      recipientRole: 'company',
      senderId: String(userId),
      senderName: user.username,
      type: 'application_received',
      title: 'New Application Received',
      message: `${user.username} applied to your opportunity: "${internship.title}"`,
      relatedId: String((application as any)._id || (application as any).id),
      relatedType: 'application',
    });

    return sendSuccess(res, 201, application, 'Application submitted successfully');
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, 400, 'You have already applied to this opportunity');
    }
    return sendError(res, 500, error.message);
  }
};

export const applyWithoutExam = async (req: AuthRequest, res: Response) => {
  try {
    const { id: internshipId } = req.params;
    const user = req.user!;

    const internship = await Internship.findById(internshipId);
    if (!internship) return sendError(res, 404, 'Opportunity not found');
    if (internship.exam && internship.exam.questions.length > 0) {
      return sendError(res, 400, 'This opportunity requires an assessment submission');
    }

    const hasApplied = await Application.findOne({ studentId: user._id, internshipId });
    if (hasApplied) return sendError(res, 400, 'Already applied to this opportunity');

    let matchCount = 0;
    const reqSkills = internship.requiredSkills || [];
    const userSkills = user.skills || [];
    if (reqSkills.length > 0) {
      reqSkills.forEach(sk => {
        if (userSkills.some(us => us.toLowerCase() === sk.toLowerCase())) matchCount++;
      });
    }
    const skillMatch = reqSkills.length > 0 ? Math.round((matchCount / reqSkills.length) * 100) : 0;

    const softSkillsSnapshot = (user as any).softSkillsAssessment?.map((a: any) => ({
      trait: a.category,
      score: a.score,
    })) || [];
    const personalitySnapshot = (user as any).personalityAssessment?.map((a: any) => ({
      trait: a.category,
      score: a.score,
    })) || [];

    // Capture recommendation scores snapshot (failure/timeout must not block application lifecycle)
    let aiScores = null;
    try {
      aiScores = await getOpportunityMatchScore(user, internship);
    } catch (err) {
      console.error('[Application Creation] Failed to get AI compatibility scores snapshot:', err);
    }

    const application = await Application.create({
      internshipId: internshipId as string,
      internshipTitle: internship.title,
      companyName: internship.companyName,
      studentId: user._id,
      studentName: user.username,
      studentEmail: user.email,
      studentPhone: user.phone,
      studentGender: user.gender,
      cvUrl: user.cvUrl,
      skills: user.skills,
      status: 'pending',
      skillMatch,
      softSkillsSnapshot,
      personalitySnapshot,
      compatibilityScore: 0,
      matchScoreAtApply: aiScores?.matchScore,
      techScoreAtApply: aiScores?.techScore,
      personalityScoreAtApply: aiScores?.personalityScore,
    });

    // Notify the organization
    await createNotification({
      recipientId: internship.companyId.toString(),
      recipientRole: 'company',
      senderId: user._id?.toString(),
      senderName: user.username,
      type: 'application_received',
      title: 'New Application Received',
      message: `${user.username} applied to your opportunity: "${internship.title}"`,
      relatedId: (application._id as any).toString(),
      relatedType: 'application',
    });

    return sendSuccess(res, 201, application, 'Applied successfully');
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, 400, 'You have already applied to this opportunity');
    }
    return sendError(res, 500, error.message);
  }
};

export const getMyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const apps = await Application.find({ studentId: req.user?._id })
      .populate({
        path: 'internshipId',
        populate: { path: 'companyId', select: 'companyName logo' }
      })
      .sort({ appliedAt: -1 });
    return sendSuccess(res, 200, apps, 'Applications fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getCompanyApplications = async (req: AuthRequest, res: Response) => {
  try {
    const internships = await Internship.find({ companyId: req.user?._id });
    const internshipIds = internships.map(i => i._id);
    const apps = await Application.find({ internshipId: { $in: internshipIds } })
      .populate('studentId', 'username profileImage')
      .sort({ appliedAt: -1 });
    const hardenedApps = apps.filter(app => app.studentId !== null && app.studentId !== undefined);

    // Sort applications descending by matchScoreAtApply, putting legacy/null match scores at the bottom
    const sortedApps = hardenedApps.sort((a, b) => {
      const scoreA = a.matchScoreAtApply !== undefined && a.matchScoreAtApply !== null ? a.matchScoreAtApply : -1;
      const scoreB = b.matchScoreAtApply !== undefined && b.matchScoreAtApply !== null ? b.matchScoreAtApply : -1;
      return scoreB - scoreA;
    });

    // Logging requirement for debugging recruiter return payload
    sortedApps.forEach(app => {
      console.log(JSON.stringify({
        student: app.studentName,
        internship: app.internshipTitle,
        matchScoreAtApply: app.matchScoreAtApply,
        techScoreAtApply: app.techScoreAtApply,
        personalityScoreAtApply: app.personalityScoreAtApply
      }, null, 2));
    });

    return sendSuccess(res, 200, sortedApps, 'Company applications fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getInternshipApplications = async (req: AuthRequest, res: Response) => {
  try {
    const apps = await Application.find({ internshipId: req.params.internshipId })
      .populate('studentId', 'username profileImage')
      .sort({ appliedAt: -1 });
    const hardenedApps = apps.filter(app => app.studentId !== null && app.studentId !== undefined);

    // Sort applications descending by matchScoreAtApply, putting legacy/null match scores at the bottom
    const sortedApps = hardenedApps.sort((a, b) => {
      const scoreA = a.matchScoreAtApply !== undefined && a.matchScoreAtApply !== null ? a.matchScoreAtApply : -1;
      const scoreB = b.matchScoreAtApply !== undefined && b.matchScoreAtApply !== null ? b.matchScoreAtApply : -1;
      return scoreB - scoreA;
    });

    // Logging requirement for debugging recruiter return payload
    sortedApps.forEach(app => {
      console.log(JSON.stringify({
        student: app.studentName,
        internship: app.internshipTitle,
        matchScoreAtApply: app.matchScoreAtApply,
        techScoreAtApply: app.techScoreAtApply,
        personalityScoreAtApply: app.personalityScoreAtApply
      }, null, 2));
    });

    return sendSuccess(res, 200, sortedApps, 'Applications fetched');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};


export const updateApplicationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['pending', 'accepted', 'rejected', 'reviewing'].includes(status)) {
      return sendError(res, 400, 'Invalid status value');
    }

    const application = await Application.findById(req.params.id);
    if (!application) return sendError(res, 404, 'Application not found');

    const internship = await Internship.findById(application.internshipId);
    if (!internship) return sendError(res, 404, 'Internship not found');

    // Robust ID comparison: String() on both sides
    const ownerId = String(internship.companyId);
    const requesterId = String((req.user as any)?._id || (req.user as any)?.id);
    if (ownerId !== requesterId) {
      return sendError(res, 403, 'Not authorized');
    }

    const oldStatus = application.status;
    application.status = status;

    if (status === 'accepted' && oldStatus !== 'accepted') {
      application.hoursEarned = internship.volunteerHours || 0;
      application.acceptedAt = new Date();
    } else if (status !== 'accepted' && oldStatus === 'accepted') {
      application.hoursEarned = 0;
      application.acceptedAt = undefined;
    }

    await application.save();

    // Notify the volunteer when their status changes (not from pending to pending)
    if (status !== oldStatus && (status === 'accepted' || status === 'rejected' || status === 'reviewing')) {
      let notificationType: NotificationType = 'application_reviewing';
      let notificationTitle = 'Application Status Update';
      let notificationMessage = `Your application for "${internship.title}" is now under review.`;

      if (status === 'accepted') {
        notificationType = 'application_accepted';
        notificationTitle = '🎉 Application Accepted!';
        notificationMessage = `Congratulations! Your application for "${internship.title}" at ${internship.companyName} has been accepted.`;
      } else if (status === 'rejected') {
        notificationType = 'application_rejected';
        notificationTitle = 'Application Not Selected';
        notificationMessage = `Your application for "${internship.title}" at ${internship.companyName} was not selected this time.`;
      } else if (status === 'reviewing') {
        notificationType = 'application_reviewing';
        notificationTitle = 'Application Under Review';
        notificationMessage = `Your application for "${internship.title}" at ${internship.companyName} is now under review.`;
      }

      await createNotification({
        recipientId: application.studentId.toString(),
        recipientRole: 'student',
        senderId: req.user?._id?.toString(),
        senderName: req.user?.companyName || (req.user as any)?.companyName,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        relatedId: (application._id as any).toString(),
        relatedType: 'application',
      });
    }

    return sendSuccess(res, 200, application, 'Status updated');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};
