// Ficheiro: backend/src/controllers/contacts.controller.ts | Função: /contacts CRUD limitado (P9)
import { Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '@lib/supabase';
import { HttpError } from '@lib/httpError';

const groupEnum = z.enum(['friend', 'family', 'colleague', 'neighbour']);

const createSchema = z.object({
  contact_user_id: z.string().uuid('Id de contacto inválido.'),
  group_type: groupEnum.optional().default('friend'),
});

function userId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'Sessão inválida.');
  return req.user.id;
}

export async function listContacts(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const { data, error } = await getSupabase()
    .from('contacts')
    .select('id, group_type, created_at, contact:users!contacts_contact_user_id_fkey(id, name, photo_url, is_driver, rating_avg)')
    .eq('user_id', me)
    .order('created_at', { ascending: false });
  if (error) throw new HttpError(500, error.message);
  res.json({ contacts: data ?? [] });
}

export async function createContact(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const body = createSchema.parse(req.body);
  if (body.contact_user_id === me) {
    throw new HttpError(400, 'Não é possível adicionar a si próprio.');
  }
  const { data, error } = await getSupabase()
    .from('contacts')
    .insert({
      user_id: me,
      contact_user_id: body.contact_user_id,
      group_type: body.group_type,
    })
    .select('id, group_type, contact_user_id, created_at')
    .single();
  if (error) {
    if (error.code === '23505') throw new HttpError(409, 'Contacto já existe.');
    throw new HttpError(500, error.message);
  }
  res.status(201).json({ contact: data });
}

export async function deleteContact(req: Request, res: Response): Promise<void> {
  const me = userId(req);
  const id = z.string().uuid('Id inválido.').parse(req.params.id);
  const { error, count } = await getSupabase()
    .from('contacts')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', me);
  if (error) throw new HttpError(500, error.message);
  if (!count) throw new HttpError(404, 'Contacto não encontrado.');
  res.status(204).send();
}
