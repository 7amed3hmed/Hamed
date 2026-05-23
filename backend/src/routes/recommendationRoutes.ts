import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { getMyRecommendations, getTopVolunteersForOpportunity } from '../controllers/recommendationController';

const router = Router();

router.get('/me', protect, getMyRecommendations);
router.get('/opportunity/:opportunityId/top-volunteers', protect, getTopVolunteersForOpportunity);

export default router;
