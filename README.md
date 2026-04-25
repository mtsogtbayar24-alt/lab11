# Bie Daalt 11

This repository contains the two required submission parts for the API Design assignment.

## Deliverables

- `partA`: bad API analysis, redesigned API, reusable library, and unit tests
- `partB`: Library Lending REST API, OpenAPI document, Postman collection, and API tests

## Repository layout

```text
bie-daalt-11/
├─ partA/
│  ├─ src/bad/
│  ├─ src/good/
│  ├─ lib/api/
│  ├─ lib/impl/
│  ├─ test/
│  └─ README.md
└─ partB/
   ├─ src/
   ├─ test/
   ├─ postman/
   ├─ openapi.yaml
   └─ README.md
```

## Quick start

Run Part A:

```bash
cd partA
npm install
npm test
npm run build
```

Run Part B:

```bash
cd partB
npm install
npm test
npm run build
npm run dev
```

## Submission notes

- Part B uses an in-memory store so the API can be started and demonstrated quickly.
- The Postman collection includes a login -> token -> create loan flow.
- More detailed implementation notes for each section are documented inside the corresponding `partA/README.md` and `partB/README.md` files.
