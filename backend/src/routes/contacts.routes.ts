// Ficheiro: backend/src/routes/contacts.routes.ts | Função: /contacts (P9)
import { Router } from 'express';
import { asyncHandler } from '@middleware/asyncHandler';
import { requireAuth } from '@middleware/auth';
import { createContact, deleteContact, listContacts } from '@controllers/contacts.controller';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listContacts));
router.post('/', asyncHandler(createContact));
router.delete('/:id', asyncHandler(deleteContact));

export default router;
