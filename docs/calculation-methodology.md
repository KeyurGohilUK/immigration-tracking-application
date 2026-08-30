# Skilled Worker calculation methodology

UrbanFox ILR performs a limited tracking calculation. It does not decide
whether a person qualifies for indefinite leave to remain and must not be used
instead of current GOV.UK guidance or qualified legal advice.

## Supported calculation

- Qualifying-period rule:
  `skilled-worker-main-applicant-qualifying-period-v1`
- Absence rule: `skilled-worker-main-applicant-absence-v1`
- Verified: 30 August 2026
- Home Office continuous-residence guidance last updated when verified: 8 June
  2026

The calculation supports a main applicant whose latest recorded permission is
Skilled Worker, Health and Care Worker, or Tier 2 (General). Appendix Skilled
Worker SW 21.1 requires five continuous years in the UK. SW 21.2 permits that
period to contain non-dependant permission in any combination of:

- Skilled Worker, Health and Care Worker, or Tier 2 (General)
- Global Talent
- Innovator Founder
- T2 Minister of Religion
- International Sportsperson
- Representative of an Overseas Business
- Tier 1, except Tier 1 (Graduate Entrepreneur)
- Scale-up

The app deliberately does not automate the narrow COVID-era provision in SW
21.2(i). A user should obtain qualified review if it may apply.

Official sources:

- [Immigration Rules Appendix Skilled Worker](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-skilled-worker)
- [Immigration Rules Appendix Continuous Residence](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence)
- [Continuous residence caseworker guidance](https://www.gov.uk/government/publications/continuous-residence-caseworker-guidance/continuous-residence-guidance-accessible-version)
- [Skilled Worker settlement: time in the UK](https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/time-uk)

## Qualifying-period method

Permissions are calculated independently for the selected profile. Dependant
permission and permission outside SW 21.2 are excluded. Consecutive qualifying
records are joined when the next record begins no later than the day after the
previous record expires. A recorded gap forces manual review because an
unrecorded section 3C extension or another official exception may affect it.

For an entry-clearance record with an actual UK arrival date, the recorded
grant date starts the lawful period. Home Office caseworker guidance states
that the time between the entry-clearance grant and arrival is lawful residence
but counts as absence. For an in-country grant, the recorded permission start
date is used.

The estimated completion date is five UK civil calendar years after the start.
The estimated earliest application date is 28 whole calendar days before that
completion date, reflecting Appendix Continuous Residence CR 1.1 and current
GOV.UK Skilled Worker settlement guidance. The latest permission expiring
before the estimate is shown as an outstanding warning, not an assumed future
grant.

## Recorded-absence method

Each completed trip contributes the UK civil-calendar dates strictly between
its departure and return. An open trip contributes completed dates through the
day before the check date, but the result is marked incomplete. Recorded days
between an entry-clearance grant and actual UK arrival are also included.

The engine checks every candidate rolling period beginning on a recorded whole
absence day and ending 12 calendar months later. It reports the period with the
largest combined total. Exactly 180 days is shown as within the recorded limit;
more than 180 is shown as a potential limit issue, not as an eligibility
failure.

Trips flagged as potentially permitted or exceptional remain in the displayed
total and force manual review. A permission granted before 11 January 2018 also
forces manual review because UrbanFox does not yet apply the transitional
consecutive-period method.

## Deliberate limitations

The calculation does not assess salary, sponsorship, continued employment,
suitability, Knowledge of Life in the UK, English language requirements,
permitted-absence evidence, imprisonment, removal or deportation history, or
every way continuous residence can be broken. It does not support dependant
settlement calculations or make a complete ILR pass/fail decision.

The UI shows rule identifiers, the verification date, official links, and an
explicit warning that rules can change.
