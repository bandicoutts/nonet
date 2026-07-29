**A generator, not a record.** Re-run this prompt against the current tree; do not read its last output as a description of the app.

---

Read-only IA and structure discovery. Do not change anything. Produce a report and print it in full.

1. Route table. Every route in `apps/web/src/app`, including groups and layouts. Path, purpose in one line, static or dynamic, server or client.
2. Reachability. For every route, every place in the app that links to it. Flag routes nothing links to, and links pointing at routes that do not exist. Do not infer reachability from the route existing.
3. Navigation surfaces. Every persistent nav component: contents, where it renders, at which breakpoints. Note anything appearing or disappearing between 768 and 1100, and anything reachable at only one width.
4. First-run state. Assume localStorage is empty. What does a first-time visitor see on each route? Which are empty, which show placeholders, which would error. Name the empty-state component or say there is none.
5. Naming. Every user-visible navigation label and page title verbatim, including board controls, modals and veils. List, do not interpret.
6. Entry points. What is at `/`. What happens on a cold visit with no history. Clicks from cold start to first digit placed.
7. State ownership. What is persisted, where, keyed how. Per-puzzle, global, or settings. Anything stored twice or derived twice.
8. Dead weight. Any component, route or export with no references. Any settings toggle no code reads. Any feature flag always one value.

For anything you cannot determine by reading, write "needs runtime check" rather than guessing.
