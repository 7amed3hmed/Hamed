import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import Internship from '../models/Internship';
import Application from '../models/Application';
import { getOpportunityMatchScore } from '../utils/recommendationUtils';

dotenv.config();

async function runBackfill() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inpalce3';
  console.log(`[Backfill] Connecting to MongoDB at ${mongoUri}...`);
  
  try {
    await mongoose.connect(mongoUri);
    console.log('[Backfill] Connected successfully to MongoDB.');

    // Find legacy applications missing matchScoreAtApply
    const legacyApps = await Application.find({
      $or: [
        { matchScoreAtApply: { $exists: false } },
        { matchScoreAtApply: null }
      ]
    });

    console.log(`[Backfill] Found ${legacyApps.length} legacy applications requiring score backfill.`);

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const app of legacyApps) {
      const appId = String(app._id);
      console.log(`\n[Backfill] Processing Application ID: ${appId}`);
      console.log(`           Student Email: ${app.studentEmail} | Internship: "${app.internshipTitle}"`);

      // Load user
      const user = await User.findById(app.studentId);
      if (!user) {
        console.warn(`           [SKIP] Student with ID ${app.studentId} not found in database.`);
        skippedCount++;
        continue;
      }

      // Load internship
      const internship = await Internship.findById(app.internshipId);
      if (!internship) {
        console.warn(`           [SKIP] Internship with ID ${app.internshipId} not found in database.`);
        skippedCount++;
        continue;
      }

      // Call Python scoring engine
      console.log(`           Invoking getOpportunityMatchScore...`);
      try {
        const scores = await getOpportunityMatchScore(user, internship);

        if (scores) {
          app.matchScoreAtApply = scores.matchScore;
          app.techScoreAtApply = scores.techScore;
          app.personalityScoreAtApply = scores.personalityScore;

          await app.save();

          console.log(`           [SUCCESS] Backfilled successfully.`);
          console.log(`                     matchScoreAtApply: ${scores.matchScore}%`);
          console.log(`                     techScoreAtApply: ${scores.techScore}%`);
          console.log(`                     personalityScoreAtApply: ${scores.personalityScore}%`);
          successCount++;
        } else {
          console.warn(`           [FAILED] Python scoring returned null (possibly incomplete onboarding/skills).`);
          failedCount++;
        }
      } catch (scoringError: any) {
        console.error(`           [FAILED] Error during scoring: ${scoringError.message}`);
        failedCount++;
      }
    }

    console.log('\n==================================================');
    console.log('[Backfill] Migration Complete Summary:');
    console.log(`           Total legacy applications found: ${legacyApps.length}`);
    console.log(`           Successfully backfilled:        ${successCount}`);
    console.log(`           Skipped (missing documents):    ${skippedCount}`);
    console.log(`           Failed (engine/profile issue):  ${failedCount}`);
    console.log('==================================================');

  } catch (error: any) {
    console.error('[Backfill] Fatal error during migration:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('[Backfill] Disconnected from MongoDB.');
  }
}

runBackfill().catch(console.error);
