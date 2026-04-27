import request from 'supertest';
import { createApp } from '../src/app';
import { LibraryStore } from '../src/store';

describe('Library Lending API', () => {
  const setup = async () => {
    const store = new LibraryStore();
    const app = createApp(store);
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'librarian', password: 'libpass' });
    return { app, store, token: loginResponse.body.accessToken as string };
  };

  test('returns token on successful login', async () => {
    const app = createApp(new LibraryStore());
    const response = await request(app)
      .post('/auth/login')
      .send({ username: 'librarian', password: 'libpass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });

  test('creates a book', async () => {
    const { app, token } = await setup();
    const response = await request(app)
      .post('/books')
      .set('Authorization', `Bearer ${token}`)
      .send({ isbn: '1', title: 'API Design', author: 'Teacher', totalCopies: 2, tags: ['api'] });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('API Design');
  });

  test('supports pagination on books', async () => {
    const app = createApp(new LibraryStore());
    const response = await request(app).get('/books?page=1&size=1&sortBy=title&order=asc');
    expect(response.status).toBe(200);
    expect(response.body.size).toBe(1);
    expect(response.body.items).toHaveLength(1);
  });

  test('creates a loan for an available book', async () => {
    const { app, token, store } = await setup();
    const response = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ memberId: store.members[0].id, bookId: store.books[0].id });

    expect(response.status).toBe(201);
    expect(response.body.memberId).toBe(store.members[0].id);
  });

  test('rejects a sixth active loan', async () => {
    const { app, token, store } = await setup();
    for (let index = 0; index < 6; index += 1) {
      store.books.push({
        id: `book-extra-${index}`,
        isbn: `isbn-${index}`,
        title: `Book ${index}`,
        author: 'Author',
        availableCopies: 1,
        totalCopies: 1,
        tags: [],
        createdAt: new Date().toISOString()
      });
    }

    for (let index = 0; index < 5; index += 1) {
      await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${token}`)
        .send({ memberId: store.members[0].id, bookId: `book-extra-${index}` });
    }

    const response = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ memberId: store.members[0].id, bookId: 'book-extra-5' });

    expect(response.status).toBe(409);
    expect(response.headers['content-type']).toContain('application/problem+json');
  });

  test('returns a loaned book', async () => {
    const { app, token, store } = await setup();
    const loanResponse = await request(app)
      .post('/loans')
      .set('Authorization', `Bearer ${token}`)
      .send({ memberId: store.members[0].id, bookId: store.books[0].id });

    const response = await request(app)
      .post(`/loans/${loanResponse.body.id}/return`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body.returnedAt).not.toBeNull();
  });

  test('returns 401 for missing token', async () => {
    const app = createApp(new LibraryStore());
    const response = await request(app).get('/loans');
    expect(response.status).toBe(401);
  });
});
