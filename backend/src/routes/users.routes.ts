// Ficheiro: backend/src/routes/users.routes.ts | Função: /users (GET me, PATCH me, GET :id) (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { getById, getMe, updateMe } from '@controllers/users.controller';

const router = Router();
router.use(requireAuth);

router.get('/me', asyncHandler(getMe));
router.patch('/me', asyncHandler(updateMe));
router.get('/:id', asyncHandler(getById));

export default router;
