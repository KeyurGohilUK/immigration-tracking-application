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
- [x] Section-based Document Vault ZIP bundle export for an individual applicant.
- [x] Structured Address History domain, encrypted storage, route-aware required
      period, and gap/overlap calculation.

## Pending

- [x] Address History UI integration: add/edit/delete structured addresses and
      link proof uploads to a specific address.
- [x] Address History readiness depends on complete route-required timeline
      coverage plus supporting address proof.
- [x] Guide Address History from the current address backwards to the
      permission-derived required start month, automatically locking each
      previous address end month to prevent gaps.
- [x] Replace Address History notes with optional inline encrypted evidence;
      saved addresses show their linked evidence count and avoid nested proof
      upload dialogs.
- [x] UK postcode lookup cancelled — no suitable open-source solution is
      available for provider-backed address selection. Keep manual structured
      address entry as the supported approach.
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
- [x] Add Download Application Bundle ZIP export with section folders and safe
      filenames. Review/select UI and a manifest/checklist can be added later.
- [x] Add individual applicant bundle first.
- [ ] Add optional combined household bundle.
- [x] Export Address History evidence as individually named files using Current
      address / Previous address prefixes.
- [x] Generate a separate paged Address History Index PDF with address periods,
      full address, evidence filenames, and Page X of Y numbering.
- [ ] Integrate Document Vault readiness into the central ILR journey/readiness
      view.
- [ ] Add focused unit/browser coverage for each completed Document Vault
      workflow.

## Product rules

- Readiness is based on requirements completed, not file count.
- Required later and Not applicable items must not unfairly reduce current
  readiness.
- Address-history duration is route-driven; never hard-code five years globally.
- Guided Address History starts with the current address and works backwards to
  the permission-derived required start month. Each previous address end month
  is set automatically to the month before the next address starts; Edit remains
  available for corrections.
- Additional Documents do not affect readiness unless explicitly linked to a
  requirement.
- Keep all document and structured evidence data encrypted and local to the
  device.
- Requirement-specific modals should keep related evidence uploads inline where
  practical; avoid nested upload modals.
- Requirement-specific modals must not allow a save when no meaningful
  requirement state has been entered. Disable the primary save action for empty
  states, and use inline validation for incomplete or contradictory states.
