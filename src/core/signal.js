// Decouples widgets that trigger a repaint from the renderer itself.
//
// Cards and filter controls need to ask for a redraw, but the renderer imports
// the cards — a direct call would be a cycle. They publish here instead and the
// renderer subscribes once at start-up.

const refreshFns = new Set();
const rebuildFns = new Set();

/** Repaint with the current data. */
export const onRefresh = fn => refreshFns.add(fn);
export const requestRefresh = () => { for (const fn of refreshFns) fn(); };

/** Recompute derived data (overrides, runtime fallbacks), then repaint. */
export const onRebuild = fn => rebuildFns.add(fn);
export const requestRebuild = () => { for (const fn of rebuildFns) fn(); };
