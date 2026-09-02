# Document Vault roadmap

This file tracks the agreed Document Vault scope independently of the broader
product roadmap.

## Implemented

- [x] Nine-section Document Vault taxonomy.
- [x] Per-member vault view.
- [x] Requirement-based readiness percentage and progress bar.
- [x] Complete, Partial, Needs attention, To do, and Required later states.
- [x] Encrypted local PDF/JPG/PNG storage.
- [x] Additional Documents category.
- [x] Basic combined PDF pack export.
- [x] Structured Address History domain, encrypted storage, route-aware required
      period, and gap/overlap calculation.

## Pending

- [x] Address History UI integration: add/edit/delete structured addresses and
      link proof uploads to a specific address.
- [x] Address History readiness depends on complete route-required timeline
      coverage plus supporting address proof.
- [ ] Add dedicated requirement-specific Liquid Glass modals for all vault
      sections.
- [x] Capture Life in the UK status, pass date, UAN/reference number, and
      optional evidence.
- [x] Capture English requirement status, evidence type, certificate/reference
      number, and optional evidence.
- [x] Keep Life in the UK and English evidence uploads inline within the
      requirement modal instead of opening a second upload modal.
- [ ] Add structured employment metadata (employer, job title, sponsorship
      status, dates, salary) and time-aware final employer-letter status.
- [ ] Add explicit Not applicable handling for conditional requirements.
- [ ] Add richer Additional Documents metadata: custom tag/category, document
      date, expiry date, notes, and reclassification.
- [ ] Add Download Application Bundle ZIP export with review/select UI, category
      folders, safe filenames, and manifest/checklist.
- [ ] Add individual applicant bundle first, then optional combined household
      bundle.
- [ ] Create consolidated Address History & Evidence PDF.
- [ ] Generate a first-page address index with Address #, From, To, Full address,
      supporting document, and final merged PDF page numbers.
- [ ] Integrate Document Vault readiness into the central ILR journey/readiness
      view.
- [ ] Add focused unit/browser coverage for each completed Document Vault
      workflow.

## Product rules

- Readiness is based on requirements completed, not file count.
- Required later and Not applicable items must not unfairly reduce current
  readiness.
- Address-history duration is route-driven; never hard-code five years globally.
- Additional Documents do not affect readiness unless explicitly linked to a
  requirement.
- Keep all document and structured evidence data encrypted and local to the
  device.
- Requirement-specific modals should keep related evidence uploads inline where
  practical; avoid nested upload modals.
- Requirement-specific modals must not allow a save when no meaningful
  requirement state has been entered. Disable the primary save action for empty
  states, and use inline validation for incomplete or contradictory states.
