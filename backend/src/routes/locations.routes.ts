// Ficheiro: backend/src/routes/locations.routes.ts | Função: /locations (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { getNearby, upsertMyLocation } from '@controllers/locations.controller';

const router = Router();
router.use(requireAuth);

router.post('/me', asyncHandler(upsertMyLocation));
router.get('/nearby', asyncHandler(getNearby));

export default router;
