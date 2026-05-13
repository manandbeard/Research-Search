# Security Specification for Sooth.fy Replica

## Data Invariants
1. A user's profile, search history, and saved papers must strictly belong to their authenticated `userId`.
2. A user cannot query, read, or list documents of another user.
3. Every document requires a `createdAt` timestamp exactly matching the server request time on creation.
4. History items require a string `query`.
5. Saved papers require a string `paperId` and `title`.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: User A attempts to write to `/users/{User_B_Id}`.
2. **Read Spoofing**: User A attempts to read from `/users/{User_B_Id}/history/{id}`.
3. **Shadow Field**: Creating a User profile with `isAdmin: true`.
4. **Invalid Query**: Creating a search history with `query: 12345`.
5. **No Timestamp**: Creating a doc without `createdAt`.
6. **Spoofed Timestamp**: Creating a doc with a past or future `createdAt` timestamp instead of server time.
7. **Type Poisoning**: `SavedPaper.year` as a string instead of number.
8. **Size Poisoning**: Writing a 2MB string into `SavedPaper.title`.
9. **Update Hijack**: Updating another user's saved paper.
10. **Immutable Field Change**: Modifying `createdAt` upon update.
11. **Delete Hijack**: Deleting another user's document.
12. **Missing Required Fields**: Creating a SearchHistory without a `query`.

## The Test Runner
A `firestore.rules.test.ts` file will verify that all data enforces isOwner() isolation and strict schema types.
