export const RENDER_PIXEL_BUDGET = 1920 * 1080;
export const MAX_RENDER_DPR = 1.5;

/** Keep the drawing buffer near Full HD while preserving CSS layout and cameras. */
export function renderDprForViewport(width, height, devicePixelRatio = 1) {
  const deviceDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const cappedDpr = Math.min(deviceDpr, MAX_RENDER_DPR);
  // Hidden canvases have no pixel cost; wait for a valid size before budgeting.
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return cappedDpr;
  // Separate square roots also avoid overflow for exceptionally large inputs.
  const budgetDpr = Math.sqrt(RENDER_PIXEL_BUDGET) / Math.sqrt(width) / Math.sqrt(height);
  return Math.min(cappedDpr, budgetDpr);
}
