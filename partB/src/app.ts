import cors from 'cors';
import express, { Request, Response } from 'express';
import { AuthenticatedRequest, login, requireAuth, requireRole } from './auth';
import { problem, sendProblem } from './problem';
import { Book, Member } from './types';
import { LibraryStore, paginate, sortItems } from './store';

function parsePage(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function createApp(store: LibraryStore = new LibraryStore()) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.post('/auth/login', (request: Request, response: Response) => {
    const { username, password } = request.body ?? {};
    if (!username || !password) {
      sendProblem(response, problem(400, 'Bad Request', 'username and password are required', request.originalUrl));
      return;
    }

    const authResult = login(username, password);
    if (!authResult) {
      sendProblem(response, problem(401, 'Unauthorized', 'Invalid username or password', request.originalUrl));
      return;
    }

    response.status(200).json(authResult);
  });

  app.get('/books', (request: Request, response: Response) => {
    const page = parsePage(request.query.page, 1);
    const size = parsePage(request.query.size, 10);
    const title = String(request.query.title ?? '').toLowerCase();
    const author = String(request.query.author ?? '').toLowerCase();
    const sortBy = request.query.sortBy as keyof Book | undefined;
    const order = request.query.order === 'desc' ? 'desc' : 'asc';

    let items = store.books.filter((book) =>
      book.title.toLowerCase().includes(title) && book.author.toLowerCase().includes(author)
    );
    items = sortItems(items, sortBy, order);
    response.status(200).json(paginate(items, page, size));
  });

  app.post('/books', requireAuth, requireRole('LIBRARIAN'), (request: AuthenticatedRequest, response: Response) => {
    const { isbn, title, author, totalCopies, tags } = request.body ?? {};
    if (!isbn || !title || !author || !Number.isInteger(totalCopies) || totalCopies <= 0) {
      sendProblem(response, problem(400, 'Bad Request', 'isbn, title, author, and positive totalCopies are required', request.originalUrl));
      return;
    }

    const book = store.createBook({
      isbn,
      title,
      author,
      totalCopies,
      availableCopies: totalCopies,
      tags: Array.isArray(tags) ? tags : []
    });
    response.status(201).json(book);
  });

  app.get('/books/:id', (request: Request, response: Response) => {
    const book = store.books.find((item) => item.id === request.params.id);
    if (!book) {
      sendProblem(response, problem(404, 'Not Found', 'Book not found', request.originalUrl));
      return;
    }
    response.status(200).json(book);
  });

  app.get('/members', requireAuth, requireRole('LIBRARIAN'), (request: AuthenticatedRequest, response: Response) => {
    const page = parsePage(request.query.page, 1);
    const size = parsePage(request.query.size, 10);
    const email = String(request.query.email ?? '').toLowerCase();
    const name = String(request.query.name ?? '').toLowerCase();
    const sortBy = request.query.sortBy as keyof Member | undefined;
    const order = request.query.order === 'desc' ? 'desc' : 'asc';

    let items = store.members.filter((member) =>
      member.email.toLowerCase().includes(email) && member.name.toLowerCase().includes(name)
    );
    items = sortItems(items, sortBy, order);
    response.status(200).json(paginate(items, page, size));
  });

  app.post('/members', requireAuth, requireRole('LIBRARIAN'), (request: AuthenticatedRequest, response: Response) => {
    const { name, email, active } = request.body ?? {};
    if (!name || !email) {
      sendProblem(response, problem(400, 'Bad Request', 'name and email are required', request.originalUrl));
      return;
    }
    if (store.members.some((member) => member.email.toLowerCase() === String(email).toLowerCase())) {
      sendProblem(response, problem(409, 'Conflict', 'A member with this email already exists', request.originalUrl));
      return;
    }

    const member = store.createMember({ name, email, active: active ?? true });
    response.status(201).json(member);
  });

  app.use((request: Request, response: Response) => {
    sendProblem(response, problem(404, 'Not Found', 'Route not found', request.originalUrl));
  });

  return app;
}
