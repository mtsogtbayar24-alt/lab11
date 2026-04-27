import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { problem, sendProblem } from './problem';
import { AuthUser, UserRole } from './types';

const users: AuthUser[] = [
  { id: 'auth-1', username: 'librarian', password: 'libpass', role: 'LIBRARIAN' },
  { id: 'auth-2', username: 'member', password: 'memberpass', role: 'MEMBER' }
];

const tokenStore = new Map<string, AuthUser>();

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function login(username: string, password: string): { accessToken: string; userId: string; role: UserRole } | null {
  const user = users.find((candidate) => candidate.username === username && candidate.password === password);
  if (!user) {
    return null;
  }
  const accessToken = randomUUID();
  tokenStore.set(accessToken, user);
  return { accessToken, userId: user.id, role: user.role };
}

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): void {
  const header = request.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    sendProblem(response, problem(401, 'Unauthorized', 'A valid bearer token is required', request.originalUrl));
    return;
  }

  const token = header.replace('Bearer ', '').trim();
  const user = tokenStore.get(token);
  if (!user) {
    sendProblem(response, problem(401, 'Unauthorized', 'The supplied token is invalid or expired', request.originalUrl));
    return;
  }

  request.user = user;
  next();
}

export function requireRole(role: UserRole) {
  return (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    if (!request.user) {
      sendProblem(response, problem(401, 'Unauthorized', 'Authentication is required', request.originalUrl));
      return;
    }

    if (request.user.role !== role) {
      sendProblem(response, problem(403, 'Forbidden', `This action requires the ${role} role`, request.originalUrl));
      return;
    }

    next();
  };
}
