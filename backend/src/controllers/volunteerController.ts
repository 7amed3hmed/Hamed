import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Application from '../models/Application';
import User from '../models/User';
import Internship from '../models/Internship';
import { sendSuccess, sendError } from '../utils/responseWrapper';
import mongoose from 'mongoose';

export const getLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const leaderboard = await Application.aggregate([
      { $match: { status: { $in: ['accepted', 'completed'] } } },
      // Join with Internship to get fallback hours if needed
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: { path: '$internship', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$studentId',
          totalHours: {
            $sum: {
              $cond: [
                { $gt: ['$hoursEarned', 0] },
                '$hoursEarned',
                { $ifNull: ['$internship.volunteerHours', 0] }
              ]
            }
          },
          opportunitiesCount: { $sum: 1 },
          lastAcceptedAt: { $max: '$acceptedAt' }
        }
      },
      // Join with User to get profile info
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          _id: 1,
          totalHours: 1,
          opportunitiesCount: 1,
          lastAcceptedAt: 1,
          username: '$user.username',
          profileImage: '$user.profileImage',
        }
      },
      { $sort: { totalHours: -1, opportunitiesCount: -1, lastAcceptedAt: -1 } }
    ]);

    const processedLeaderboard = leaderboard.map((item, index) => ({
      _id: item._id.toString(),
      id: item._id.toString(),
      username: item.username || 'Unknown',
      profileImage: item.profileImage,
      totalHours: typeof item.totalHours === 'number' && !isNaN(item.totalHours) ? item.totalHours : 0,
      opportunitiesCount: typeof item.opportunitiesCount === 'number' && !isNaN(item.opportunitiesCount) ? item.opportunitiesCount : 0,
      rank: index + 1
    }));

    return sendSuccess(res, 200, processedLeaderboard, 'Leaderboard fetched successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};

export const getVolunteerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const volunteerId = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(volunteerId)) {
      return sendError(res, 400, 'Invalid volunteer ID');
    }

    const user = await User.findById(volunteerId).select('-password -verificationCode -otpExpiresAt -email');
    if (!user || user.role !== 'student') {
      return sendError(res, 404, 'Volunteer not found');
    }

    // Get accepted or completed opportunities
    const applications = await Application.find({ studentId: volunteerId, status: { $in: ['accepted', 'completed'] } })
      .sort({ acceptedAt: -1 })
      .select('internshipTitle companyName hoursEarned acceptedAt internshipId');

    const processedApps = [];
    for (const app of applications) {
      const appObj = app.toObject();
      if (!appObj.hoursEarned) {
        // Find internship to get fallback hours
        const internship = await Internship.findById(app.internshipId).select('volunteerHours');
        appObj.hoursEarned = internship?.volunteerHours || 0;
      }
      processedApps.push({
        _id: appObj._id ? appObj._id.toString() : '',
        internshipId: appObj.internshipId ? appObj.internshipId.toString() : '',
        internshipTitle: appObj.internshipTitle || 'Opportunity',
        companyName: appObj.companyName || 'Organization',
        hoursEarned: appObj.hoursEarned || 0,
        acceptedAt: appObj.acceptedAt || null
      });
    }

    // Calculate rank
    const leaderboard = await Application.aggregate([
      { $match: { status: { $in: ['accepted', 'completed'] } } },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: { path: '$internship', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$studentId',
          totalHours: {
            $sum: {
              $cond: [
                { $gt: ['$hoursEarned', 0] },
                '$hoursEarned',
                { $ifNull: ['$internship.volunteerHours', 0] }
              ]
            }
          },
          opportunitiesCount: { $sum: 1 },
          lastAcceptedAt: { $max: '$acceptedAt' }
        }
      },
      { $sort: { totalHours: -1, opportunitiesCount: -1, lastAcceptedAt: -1 } }
    ]);

    const leaderIdx = leaderboard.findIndex(item => item._id.toString() === volunteerId);
    const rank = leaderIdx !== -1 ? leaderIdx + 1 : leaderboard.length + 1;
    const stats = leaderIdx !== -1 ? leaderboard[leaderIdx] : { totalHours: 0, opportunitiesCount: 0 };

    const userObj = user.toObject();
    userObj.skills = userObj.skills || [];
    userObj.interests = userObj.interests || [];

    return sendSuccess(res, 200, {
      profile: userObj,
      applications: processedApps,
      rank,
      totalHours: stats.totalHours || 0,
      opportunitiesCount: stats.opportunitiesCount || 0
    }, 'Volunteer profile fetched successfully');
  } catch (error: any) {
    return sendError(res, 500, error.message);
  }
};
