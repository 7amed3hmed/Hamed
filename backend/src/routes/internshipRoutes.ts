import { Router } from 'express';
import {
  getInternships,
  getMyInternships,
  getInternshipById,
  createInternship,
  updateInternship,
  deleteInternship,
  getExam
} from '../controllers/internshipController';
import { protect, authorize, optionalProtect } from '../middlewares/auth';

const router = Router();

// Public listing — optionalProtect lets the controller distinguish company users
// so they can see all their own opportunities (pending/rejected/approved)
router.get('/', optionalProtect, getInternships);

// Protected: company's own opportunities (all statuses) — used by dashboard & manage pages
router.get('/mine', protect, authorize('company'), getMyInternships);

router.get('/:id', optionalProtect, getInternshipById);
router.post('/', protect, authorize('company'), createInternship);
router.put('/:id', protect, authorize('company'), updateInternship);
router.delete('/:id', protect, authorize('company', 'admin'), deleteInternship);

import { submitExamAndApply, applyWithoutExam } from '../controllers/applicationController';

router.get('/:id/exam', protect, authorize('student'), getExam);
router.post('/:id/apply', protect, authorize('student'), applyWithoutExam);
router.post('/:id/exam/submit', protect, authorize('student'), submitExamAndApply);

export default router;
