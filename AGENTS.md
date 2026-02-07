# npm-up

## Running tests

run tests with 'npm test'

## Implementation Plans

### Creating

- create plans in the plans directory
- name every plan file with a `yymmdd-hhmmss-` prefix using 24-hour time (for example `260207-132841-upgrade-command-feature.md`)
- Make detailed task lists which can be checked off with markdown checklists
- propose several tradeoffs during the plan phase and prompt the user for feedback
- document all design decisions in the plan document. do not document all options considered, just document which approach was settled on.

### Executing

- when work begins, mark the task in the plan as pending.
- When work completes, mark the task as complete
- tasks are not complete until all tests pass for the feature
- When an entire plan is complete, move it into the plans/archive directory
