export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  deleted: boolean;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
}

export interface UpdateUserInput {
  displayName?: string;
}

export class UserNotFoundError extends Error {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateUserError extends Error {
  constructor(email: string) {
    super(`User already exists: ${email}`);
    this.name = 'DuplicateUserError';
  }
}

/**
 * Provides a small, intention-revealing API for user lifecycle operations.
 *
 * The class hides storage details and avoids flag-based methods.
 */
export class UserDirectory {
  private readonly users = new Map<string, UserRecord>();

  /**
   * Creates a new active user.
   *
   * Preconditions:
   * - `input.email` must be unique and non-empty.
   * - `input.displayName` must be non-empty.
   *
   * Postconditions:
   * - Returns the newly created user.
   * - Stores the user in the directory.
   *
   * Error conditions:
   * - Throws `DuplicateUserError` when another user already has the same email.
   */
  createUser(input: CreateUserInput): UserRecord {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    if (this.findByEmail(email)) {
      throw new DuplicateUserError(email);
    }

    const user: UserRecord = {
      id: `user_${this.users.size + 1}`,
      email,
      displayName,
      deleted: false
    };

    this.users.set(user.id, user);
    return user;
  }

  /**
   * Updates mutable fields for an existing user.
   *
   * Preconditions:
   * - `userId` must identify an existing user.
   *
   * Postconditions:
   * - Returns the updated user.
   *
   * Error conditions:
   * - Throws `UserNotFoundError` when the user does not exist.
   */
  updateUser(userId: string, update: UpdateUserInput): UserRecord {
    const user = this.getRequiredUser(userId);
    const next: UserRecord = {
      ...user,
      displayName: update.displayName?.trim() || user.displayName
    };
    this.users.set(userId, next);
    return next;
  }

  /**
   * Soft deletes a user.
   *
   * Preconditions:
   * - `userId` must identify an existing user.
   *
   * Postconditions:
   * - The user is marked as deleted.
   *
   * Error conditions:
   * - Throws `UserNotFoundError` when the user does not exist.
   */
  deactivateUser(userId: string): void {
    const user = this.getRequiredUser(userId);
    this.users.set(userId, { ...user, deleted: true });
  }

  /**
   * Restores a previously soft-deleted user.
   *
   * Preconditions:
   * - `userId` must identify an existing user.
   *
   * Postconditions:
   * - The user is marked as active.
   *
   * Error conditions:
   * - Throws `UserNotFoundError` when the user does not exist.
   */
  restoreUser(userId: string): void {
    const user = this.getRequiredUser(userId);
    this.users.set(userId, { ...user, deleted: false });
  }

  /**
   * Finds a user by identifier.
   *
   * Preconditions:
   * - `userId` must be non-empty.
   *
   * Postconditions:
   * - Returns the user when present, otherwise throws.
   *
   * Error conditions:
   * - Throws `UserNotFoundError` when the user does not exist.
   */
  getUserById(userId: string): UserRecord {
    return this.getRequiredUser(userId);
  }

  /**
   * Finds a user by email.
   *
   * Preconditions:
   * - `email` must be non-empty.
   *
   * Postconditions:
   * - Returns the user when present, otherwise `undefined`.
   */
  findByEmail(email: string): UserRecord | undefined {
    const normalized = email.trim().toLowerCase();
    return Array.from(this.users.values()).find((user) => user.email === normalized);
  }

  /**
   * Searches users by display name or email.
   *
   * Preconditions:
   * - `query` must be non-empty.
   *
   * Postconditions:
   * - Returns matching users without exposing storage internals.
   */
  search(query: string): UserRecord[] {
    const normalized = query.trim().toLowerCase();
    return Array.from(this.users.values()).filter((user) =>
      user.email.includes(normalized) || user.displayName.toLowerCase().includes(normalized)
    );
  }

  private getRequiredUser(userId: string): UserRecord {
    const user = this.users.get(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }
    return user;
  }
}
