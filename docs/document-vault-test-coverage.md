# Document Vault test coverage

Document Vault is protected by focused domain tests for business rules and critical
Playwright flows for user-visible behaviour.

## Coverage map

- Readiness calculation and section states:
  `src/features/documents/domain/document-vault.test.ts`
- Route-driven applicability and settlement age/rule boundaries:
  `src/features/documents/domain/document-requirement-rules.test.ts` and
  `src/features/documents/domain/document-vault-workflows.test.ts`
- Guided Address History validation, coverage, gaps and route duration:
  `src/features/documents/domain/address-history.test.ts`
- Life in the UK and English structured requirement state:
  `src/features/documents/domain/life-english.test.ts`
- Employment details and employer-letter timing:
  `src/features/documents/domain/employment.test.ts`
- Document validation, signatures and Additional Documents metadata:
  `src/features/documents/domain/document.test.ts`
- Individual and combined household ZIP structure and filenames:
  `src/features/documents/services/document-bundle-service.test.ts`
- Address evidence filenames and Address History index generation:
  `src/features/documents/services/address-evidence-export-service.test.ts`

## Browser coverage

Critical Vault journeys are covered in `tests/e2e/app-shell.spec.ts`, including:

- Address History guided entry and evidence
- Life in the UK and English evidence
- employment evidence and requirement-specific dialogs
- route-driven Not applicable behaviour
- Additional Documents metadata and reclassification
- individual ZIP export
- combined household ZIP export
- ILR/Vault readiness integration

Cross-profile document isolation is covered by
`tests/e2e/family-isolation.spec.ts`.

The test suite deliberately avoids duplicating every domain permutation in
Playwright. Business-rule boundaries stay in unit tests; Playwright covers the
critical user workflows and integration points.
