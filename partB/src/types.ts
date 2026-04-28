export type UserRole = 'LIBRARIAN' | 'MEMBER';

export interface AuthUser {
  id: string;
  username: string;
  password: string;
  role: UserRole;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  availableCopies: number;
  totalCopies: number;
  tags: string[];
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
}

export interface Loan {
  id: string;
  bookId: string;
  memberId: string;
  loanedAt: string;
  dueAt: string;
  returnedAt: string | null;
  renewalCount: number;
}

export interface Reservation {
  id: string;
  bookId: string;
  memberId: string;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  createdAt: string;
}

export interface PaginationResult<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
