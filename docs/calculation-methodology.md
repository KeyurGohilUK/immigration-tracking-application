# Recorded absence calculation methodology

UrbanFox ILR performs a limited tracking check. It does not decide whether a
person qualifies for indefinite leave to remain and must not be used instead of
current GOV.UK guidance or qualified legal advice.

## Supported first slice

Rule identifier: `skilled-worker-main-applicant-absence-v1`  
Verified: 30 August 2026  
Home Office guidance last updated when verified: 8 June 2026

The check applies only when the selected profile has a main-applicant Skilled
Worker or Health and Care Worker permission. It compares the profile's recorded
travel with these official rules:

- Skilled Worker and Health and Care Worker settlement normally requires five
  years in the UK and no more than 180 days outside the UK in any 12 months.
- Appendix Continuous Residence states that more than 180 days outside the UK
  in any 12-month period breaks continuous residence unless an applicable
  exception applies.
- Home Office caseworker guidance says to count only whole days. The departure
  and return dates are therefore excluded.
- Absences during permission granted before 11 January 2018 use a transitional
  calculation rather than the current rolling method.

Official sources:

- [Immigration Rules Appendix Continuous Residence](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence)
- [Continuous residence caseworker guidance](https://www.gov.uk/government/publications/continuous-residence-caseworker-guidance/continuous-residence-guidance-accessible-version)
- [Skilled Worker settlement: time in the UK](https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/time-uk)

## Implemented method

Each completed trip contributes the UK civil-calendar dates strictly between
its departure and return. An open trip contributes completed dates through the
day before the check date, but the result is marked incomplete.

The engine checks every candidate rolling period beginning on a recorded whole
absence day and ending 12 calendar months later. It reports the period with the
largest combined total. Exactly 180 days is shown as within the recorded limit;
more than 180 is shown as a potential limit issue, not as an eligibility
failure.

Trips flagged as potentially permitted or exceptional are included in the
displayed total and force manual review. UrbanFox does not decide whether the
official exception applies. A missing visa grant date produces an incomplete
result. A permission granted before 11 January 2018 forces manual review because
the app does not yet apply the transitional method.

## Deliberate limitations

This slice does not yet:

- establish a complete five-year qualifying period or earliest application
  date
- decide which combinations of permission count
- detect permission gaps or all reasons continuous residence may be broken
- decide whether a permitted-absence exception applies
- implement the pre-11-January-2018 consecutive-period calculation
- produce a complete ILR pass or fail result

The UI shows the rule identifier, verification date, official links, and an
explicit warning that rules can change.
