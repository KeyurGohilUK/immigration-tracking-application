# Skilled Worker calculation methodology

UrbanFox ILR performs a limited tracking calculation. It does not decide
whether a person qualifies for indefinite leave to remain and must not be used
instead of current GOV.UK guidance or qualified legal advice.

## Supported calculation

- Qualifying-period rule:
  `skilled-worker-main-applicant-qualifying-period-v1`
- Absence rule: `skilled-worker-main-applicant-absence-v2`
- Verified: 4 September 2026
- Immigration Rules Appendix Continuous Residence checked against the version
  updated 3 August 2026.
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

The app also provides a separate recorded timing estimate for a Skilled Worker,
Health and Care Worker, or Tier 2 (General) dependant partner. It joins only
consecutive permissions recorded as a dependant on those routes and never
combines dependant time with main-applicant time. The estimate always requires
manual confirmation that every dependant grant was linked to the same partner,
because UrbanFox does not collect or verify partner identity or relationship
history. It does not assess the lead applicant's settlement status or the other
relationship requirements in Appendix Skilled Worker.

Official sources:

- [Immigration Rules Appendix Skilled Worker](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-skilled-worker)
- [Immigration Rules Appendix Continuous Residence](https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-continuous-residence)
- [Continuous residence caseworker guidance](https://www.gov.uk/government/publications/continuous-residence-caseworker-guidance/continuous-residence-guidance-accessible-version)
- [Skilled Worker settlement: time in the UK](https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/time-uk)
- [Skilled Worker settlement: family members](https://www.gov.uk/indefinite-leave-to-remain-tier-2-t2-skilled-worker-visa/family-members)

## Qualifying-period method

Permissions are calculated independently for the selected profile. The
main-applicant and dependant engines remain separate. Permission outside the
applicable route and role is excluded. Consecutive qualifying records are joined
when the next record begins no later than the day after the previous record
expires. A recorded gap forces manual review because an
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

For absence days falling under permission granted on or after 11 January 2018,
the engine checks every candidate rolling period beginning on a recorded whole
absence day and ending 12 calendar months later.

For absence days falling under permission granted before 11 January 2018, the
engine applies the transitional method in Appendix Continuous Residence CR 3.2:
those days are grouped into consecutive 12-month periods ending on the same
month and day as the prospective application date. UrbanFox uses the calculated
earliest application date when one is available; otherwise it uses the current
check date as the tracking anchor. This is still an estimate because the actual
application date may differ.

Where a historical permission spans beyond 11 January 2018, absences remain on
the transitional method until that permission ends; absences under a later grant
are evaluated on the rolling method. The engine reports whichever relevant
12-month period contains the largest recorded total. Exactly 180 days is shown
as within the recorded limit; more than 180 is shown as a potential limit issue,
not as an eligibility failure.

Trips flagged as potentially permitted or exceptional remain in the displayed
total and force manual review. Pre-11-January-2018 permission is retained as an
informational issue in the structured result but no longer forces manual review
by itself because the transitional calculation is now implemented.

## Verification review — 4 September 2026

The calculation was manually reviewed against the current official GOV.UK
sources for the supported Skilled Worker scope. The review confirmed:

- SW 21.1 requires a five-year continuous period.
- SW 21.2 permits the configured combination of qualifying routes, excluding
  dependant permission. The narrow SW 21.2(i) COVID-era provision remains
  deliberately unautomated.
- Appendix Continuous Residence CR 1.1 supports the 28-day application timing
  estimate.
- CR 3.1 applies the 180-day limit to rolling 12-month periods.
- CR 3.2 requires absences under permission granted before 11 January 2018 to
  use consecutive 12-month periods ending on the application-date anniversary.
- Current caseworker guidance confirms that whole days only are counted and that
  time between entry-clearance grant and UK arrival counts as absence.

## Deliberate limitations

The calculation does not assess salary, sponsorship, continued employment,
suitability, Knowledge of Life in the UK, English language requirements,
permitted-absence evidence, imprisonment, removal or deportation history, or
every way continuous residence can be broken. The dependant estimate cannot
verify same-partner history, relationship requirements, the lead applicant's
status, or child-dependant rules. It does not make a complete ILR pass/fail
decision.

The UI shows rule identifiers, the verification date, official links, and an
explicit warning that rules can change.
