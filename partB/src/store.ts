import { randomUUID } from 'crypto';
import { Book, Loan, Member, PaginationResult } from './types';

export class LibraryStore {
  public readonly books: Book[] = [
    {
      id: 'book-1',
      isbn: '978-0132350884',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      availableCopies: 3,
      totalCopies: 3,
      tags: ['software', 'clean-code'],
      createdAt: new Date().toISOString()
    },
    {
      id: 'book-2',
      isbn: '978-0321125217',
      title: 'Domain-Driven Design',
      author: 'Eric Evans',
      availableCopies: 1,
      totalCopies: 1,
      tags: ['software', 'ddd'],
      createdAt: new Date().toISOString()
    }
  ];

  public readonly members: Member[] = [
    {
      id: 'member-1',
      name: 'Default Member',
      email: 'member@example.com',
      active: true,
      createdAt: new Date().toISOString()
    }
  ];

  public readonly loans: Loan[] = [];

  createBook(input: Omit<Book, 'id' | 'createdAt'>): Book {
    const book: Book = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.books.push(book);
    return book;
  }

  createMember(input: Omit<Member, 'id' | 'createdAt'>): Member {
    const member: Member = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.members.push(member);
    return member;
  }

  createLoan(input: Omit<Loan, 'id'>): Loan {
    const loan: Loan = { ...input, id: randomUUID() };
    this.loans.push(loan);
    return loan;
  }
}

export function paginate<T>(items: T[], page: number, size: number): PaginationResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / size));
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page,
    size,
    totalItems,
    totalPages
  };
}

export function sortItems<T>(items: T[], sortBy: keyof T | undefined, order: 'asc' | 'desc'): T[] {
  if (!sortBy) {
    return [...items];
  }

  return [...items].sort((left, right) => {
    const leftValue = String(left[sortBy] ?? '');
    const rightValue = String(right[sortBy] ?? '');
    const result = leftValue.localeCompare(rightValue);
    return order === 'asc' ? result : -result;
  });
}
