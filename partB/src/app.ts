import cors from 'cors';
import express, { Request, Response } from 'express';
import { AuthenticatedRequest, login, requireAuth, requireRole } from './auth';
import { problem, sendProblem } from './problem';
import { Book, Loan, Member } from './types';
import { LibraryStore, paginate, sortItems } from './store';

const MAX_ACTIVE_LOANS = 5;
const LOAN_DURATION_DAYS = 14;

function parsePage(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
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

  app.get('/loans', requireAuth, (request: AuthenticatedRequest, response: Response) => {
    const page = parsePage(request.query.page, 1);
    const size = parsePage(request.query.size, 10);
    const memberId = String(request.query.memberId ?? '');
    const sortBy = request.query.sortBy as keyof Loan | undefined;
    const order = request.query.order === 'desc' ? 'desc' : 'asc';

    let items = store.loans.filter((loan) => (memberId ? loan.memberId === memberId : true));
    items = sortItems(items, sortBy, order);
    response.status(200).json(paginate(items, page, size));
  });

  app.post('/loans', requireAuth, requireRole('LIBRARIAN'), (request: AuthenticatedRequest, response: Response) => {
    const { memberId, bookId } = request.body ?? {};
    const member = store.members.find((item) => item.id === memberId && item.active);
    if (!member) {
      sendProblem(response, problem(404, 'Not Found', 'Member not found', request.originalUrl));
      return;
    }

    const book = store.books.find((item) => item.id === bookId);
    if (!book) {
      sendProblem(response, problem(404, 'Not Found', 'Book not found', request.originalUrl));
      return;
    }

    const activeLoans = store.loans.filter((loan) => loan.memberId === memberId && loan.returnedAt === null).length;
    if (activeLoans >= MAX_ACTIVE_LOANS) {
      sendProblem(response, problem(409, 'Conflict', 'A member cannot borrow more than 5 books at the same time', request.originalUrl));
      return;
    }

    if (book.availableCopies <= 0) {
      sendProblem(response, problem(422, 'Unprocessable Entity', 'No available copies remain for the requested book', request.originalUrl));
      return;
    }

    book.availableCopies -= 1;
    const loan = store.createLoan({
      bookId,
      memberId,
      loanedAt: new Date().toISOString(),
      dueAt: addDays(LOAN_DURATION_DAYS),
      returnedAt: null,
      renewalCount: 0
    });
    response.status(201).json(loan);
  });

  app.post('/loans/:id/renew', requireAuth, requireRole('LIBRARIAN'), (request: AuthenticatedRequest, response: Response) => {
    const loan = store.loans.find((item) => item.id === request.params.id);
    if (!loan) {
      sendProblem(response, problem(404, 'Not Found', 'Loan not found', request.originalUrl));
      return;
    }
    if (loan.returnedAt !== null) {
      sendProblem(response, problem(422, 'Unprocessable Entity', 'Returned loans cannot be renewed', request.originalUrl));
      return;
    }
    if (loan.renewalCount >= 1) {
      sendProblem(response, problem(422, 'Unprocessable Entity', 'A loan can only be renewed once', request.originalUrl));
      return;
    }

    loan.renewalCount += 1;
    loan.dueAt = addDays(LOAN_DURATION_DAYS);
    response.status(200).json(loan);
  });

  app.post('/loans/:id/return', requireAuth, requireRole('LIBRARIAN'), (request: AuthenticatedRequest, response: Response) => {
    const loan = store.loans.find((item) => item.id === request.params.id);
    if (!loan) {
      sendProblem(response, problem(404, 'Not Found', 'Loan not found', request.originalUrl));
      return;
    }
    if (loan.returnedAt !== null) {
      sendProblem(response, problem(422, 'Unprocessable Entity', 'Loan has already been returned', request.originalUrl));
      return;
    }

    loan.returnedAt = new Date().toISOString();
    const book = store.books.find((item) => item.id === loan.bookId);
    if (book) {
      book.availableCopies += 1;
    }

    response.status(200).json(loan);
  });

  app.use((request: Request, response: Response) => {
    sendProblem(response, problem(404, 'Not Found', 'Route not found', request.originalUrl));
  });

  return app;
}
