# ILR dashboard reconciliation

The ILR journey is the product dashboard for settlement tracking. It already
contains the selected household member, qualifying-period progress, estimated
application date, absence status, Document Vault readiness, milestone status,
permission history and the combined immigration/travel timeline.

This avoids maintaining a second dashboard with duplicate calculations.

## Outstanding information

The ILR journey now also includes a **What needs attention** summary derived
from the same calculation and Document Vault results. It surfaces only recorded
gaps or review states, including:

- missing or review-required permission history
- incomplete, exceptional, open-trip or potentially over-limit absence checks
- applicable Life in the UK and English requirements that remain incomplete
- outstanding applicable required Document Vault items
- unavailable Document Vault readiness

Route-driven Not applicable requirements are excluded from this summary.
