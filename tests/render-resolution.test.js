import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_RENDER_DPR, RENDER_PIXEL_BUDGET, renderDprForViewport } from '../src/render-resolution.js';

function drawingPixels(width, height, dpr) {
  // WebGL drawing buffers use integer dimensions.
  return Math.floor(width * dpr) * Math.floor(height * dpr);
}

test('ordinary desktop and low-density screens keep their native resolution', () => {
  assert.equal(renderDprForViewport(1280, 820, 1), 1);
  assert.equal(renderDprForViewport(1280, 820, .75), .75);
  assert.equal(renderDprForViewport(1280, 820), 1);
});

test('Retina rendering is bounded by both pixel count and DPR', () => {
  assert.equal(renderDprForViewport(800, 600, 2), MAX_RENDER_DPR);
  const dpr = renderDprForViewport(1280, 820, 2);
  assert.ok(dpr > 1 && dpr < MAX_RENDER_DPR, 'desktop Retina retains extra detail within the budget');
  assert.ok(drawingPixels(1280, 820, dpr) <= RENDER_PIXEL_BUDGET);
  assert.ok(drawingPixels(1280, 820, dpr) > RENDER_PIXEL_BUDGET * .998, 'available pixel budget should be used');
});

test('the observed 3840 × 1698 buffer falls to about two million pixels', () => {
  const observedDpr = renderDprForViewport(3840, 1698, 1);
  assert.ok(observedDpr > 0 && observedDpr < 1);
  assert.ok(drawingPixels(3840, 1698, observedDpr) <= RENDER_PIXEL_BUDGET);
  // The same buffer size can also occur on a smaller Retina viewport.
  const dpr = renderDprForViewport(1920, 849, 2);
  const pixels = drawingPixels(1920, 849, dpr);
  assert.ok(pixels <= RENDER_PIXEL_BUDGET);
  assert.ok(pixels < (3840 * 1698) / 3, 'reduce the observed fill work by more than two thirds');
  assert.ok(dpr > 1, 'this viewport can retain some Retina detail');
  const hugeViewportDpr = renderDprForViewport(3840, 1698, 2);
  assert.ok(hugeViewportDpr > 0 && hugeViewportDpr < 1, 'large CSS canvases must allow DPR below 1');
  assert.ok(drawingPixels(3840, 1698, hugeViewportDpr) <= RENDER_PIXEL_BUDGET);
});

test('resize and monitor-density changes remain inside all resolution limits', () => {
  for (const [width, height] of [[640, 480], [1280, 820], [1920, 1080], [3840, 2160], [5120, 1440]]) {
    for (const deviceDpr of [.5, .75, 1, 1.25, 2, 3]) {
      const dpr = renderDprForViewport(width, height, deviceDpr);
      assert.ok(dpr > 0 && dpr <= deviceDpr && dpr <= MAX_RENDER_DPR);
      assert.ok(drawingPixels(width, height, dpr) <= RENDER_PIXEL_BUDGET);
    }
  }
});

test('hidden or invalid measurements return a safe finite ratio', () => {
  for (const [width, height] of [[0, 0], [0, 820], [1280, 0], [-1, 820], [NaN, 820], [1280, Infinity], [undefined, 820]]) {
    assert.equal(renderDprForViewport(width, height, 2), MAX_RENDER_DPR);
    assert.equal(renderDprForViewport(width, height, .75), .75);
  }
  for (const deviceDpr of [NaN, Infinity, 0, -1, null, '2']) {
    assert.equal(renderDprForViewport(1280, 820, deviceDpr), 1);
  }
  const hugeDpr = renderDprForViewport(Number.MAX_VALUE, Number.MAX_VALUE, 2);
  assert.ok(Number.isFinite(hugeDpr) && hugeDpr > 0);
});
