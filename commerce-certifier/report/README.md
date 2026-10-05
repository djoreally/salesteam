# Certification Reports

Each receipt must include:
- `receiptId`
- `milestoneId` (e.g. `core-v1`)
- `providerResults` (with testsPassed / testsTotal / capabilitiesCertified / capabilitiesRequired)
- `writeReadbackPairs` (verified relationships between every production write and its readback)
- `integrityChecks` (simulated evidence = 0, unverified writes = 0)
- `signature` (Ed25519)

No receipt without real evidence pairs passes verification.
