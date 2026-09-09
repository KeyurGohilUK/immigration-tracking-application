# ILR journey timeline

The ILR page combines recorded immigration permissions and travel absences into
one chronological timeline for the selected household member.

## Behaviour

- Items are ordered oldest to newest by their start/departure date.
- Permission entries show the route, role, recorded permission dates and whether
  the permission is current or part of the qualifying-period calculation.
- Travel entries show the destination, departure/return dates and the number of
  whole days recorded outside the UK.
- Open trips remain explicit instead of assuming a return date.
- Potentially permitted/exceptional absences remain visibly flagged for review.
- The timeline is read-only. Permission editing stays in Permission history and
  trip editing stays in Travel, so the ILR page does not duplicate those forms.

The timeline uses the same encrypted local permission and trip records already
used by the ILR calculations. No separate timeline data is stored.
