// Ficheiro: backend/src/lib/httpError.ts | Função: erro HTTP tipado para o handler global (P9)
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
