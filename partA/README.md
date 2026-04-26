# Part A

## A.1 Bad API analysis

The original API contains several design problems:

1. `usr_mgr` violates naming consistency and readability. The class name does not communicate domain intent clearly.
2. `db_conn` is a public field, which breaks information hiding because storage internals leak to callers.
3. `users_arr` is public mutable state, so callers can modify internal data without invariants.
4. `do_user_op` uses a numeric flag for multiple unrelated actions. This increases cognitive load and makes invalid combinations possible.
5. `obj: any` removes type safety and hides the operation contract.
6. `timeout` is mixed into domain behavior even though user lifecycle actions should not be controlled through one generic method.
7. `get_u` returns either JSON text or an error string, which mixes success and failure channels and forces callers to parse ad hoc values.
8. `get_u(id_or_email, flag)` overloads two concepts in one parameter set and relies on another flag to explain which lookup to perform.
9. `find(q)` exposes a low-level SQL flavored exception in the public contract, leaking implementation details.
10. The API uses inconsistent names such as `do_user_op`, `get_u`, and `find`, which describe actions at different abstraction levels.

## A.1 Improved API

The redesigned API uses a `UserDirectory` class with explicit methods:

- `createUser`
- `updateUser`
- `deactivateUser`
- `restoreUser`
- `getUserById`
- `findByEmail`
- `search`

This removes flags, hides storage, uses typed inputs and outputs, and communicates failure through domain exceptions.

## A.2 Library design

Chosen topic: Retry policy library.

Public API:

- `RetryPolicy`
- `createRetryPolicy`
- `RetryPolicyError`
- `RetryOperationFailedError`

Concrete implementations hidden behind the factory:

- `NoRetryPolicy`
- `ExponentialBackoffRetryPolicy`
- `FullJitterRetryPolicy`

Design decisions:

- One shared interface keeps callers independent from concrete algorithms.
- A factory centralizes creation and prevents consumers from depending on implementation classes.
- Domain-specific exceptions provide a stable failure contract.
- Public methods include TSDoc with preconditions, postconditions, and failure semantics.
- Unit tests cover success, failure, retry counts, and delay behavior.
