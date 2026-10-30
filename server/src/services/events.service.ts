import type { Response } from 'express';
import type { Role } from '../config/constants';

/**
 * Server-Sent Events hub. Each browser tab holds one connection; the frontend
 * refetches the relevant data when it receives an event.
 */
interface Client {
  userId: string;
  role: Role;
  res: Response;
}

export type LiveEvent =
  | { type: 'queue.updated'; data: { counterId: string; mealId: string; date: string; reason: string } }
  | { type: 'counter.updated'; data: { counterId: string } }
  | { type: 'menu.updated'; data: { date?: string } }
  | { type: 'config.updated'; data: Record<string, never> }
  | { type: 'notification'; data: unknown };

const clients = new Set<Client>();

function write(res: Response, event: LiveEvent) {
  res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

export const events = {
  subscribe(userId: string, role: Role, res: Response) {
    const client: Client = { userId, role, res };
    clients.add(client);
    res.write(`event: connected\ndata: {}\n\n`);
    const heartbeat = setInterval(() => res.write(`: ping\n\n`), 25_000);
    res.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(client);
    });
  },

  broadcast(event: LiveEvent) {
    for (const c of clients) write(c.res, event);
  },

  toUser(userId: string, event: LiveEvent) {
    for (const c of clients) if (c.userId === userId) write(c.res, event);
  },

  connectionCount: () => clients.size,
};
