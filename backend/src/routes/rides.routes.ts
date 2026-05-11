// Ficheiro: backend/src/routes/rides.routes.ts | Função: /rides (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { createRide, listRides, updateStatus } from '@controllers/rides.controller';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listRides));
router.post('/', asyncHandler(createRide));
router.patch('/:id/status', asyncHandler(updateStatus));

export default router;
