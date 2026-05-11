// Ficheiro: backend/src/routes/sos.routes.ts | Função: POST /sos (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { triggerSos } from '@controllers/sos.controller';

const router = Router();
router.use(requireAuth);

router.post('/', asyncHandler(triggerSos));

export default router;
