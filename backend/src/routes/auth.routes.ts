// Ficheiro: backend/src/routes/auth.routes.ts | Função: rotas POST /auth/otp e POST /auth/verify (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requestOtp, verifyOtp } from '@controllers/auth.controller';

const router = Router();

router.post('/otp', asyncHandler(requestOtp));
router.post('/verify', asyncHandler(verifyOtp));

export default router;
