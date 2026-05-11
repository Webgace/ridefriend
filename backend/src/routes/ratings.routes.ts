// Ficheiro: backend/src/routes/ratings.routes.ts | Função: /ratings (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { createRating } from '@controllers/ratings.controller';

const router = Router();
router.use(requireAuth);

router.post('/', asyncHandler(createRating));

export default router;
