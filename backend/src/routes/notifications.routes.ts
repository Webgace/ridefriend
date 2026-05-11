// Ficheiro: backend/src/routes/notifications.routes.ts | Função: /notifications (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { alertContacts } from '@controllers/notifications.controller';

const router = Router();
router.use(requireAuth);

router.post('/alert-contacts', asyncHandler(alertContacts));

export default router;
