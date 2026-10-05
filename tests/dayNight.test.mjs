import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceTime, daylightAt, DEFAULT_LIGHTING, formatTime, wrapTime } from '../src/features/rendering/dayNight.ts';

test('automatic cycle advances by elapsed time and wraps through midnight', () => {
    assert.equal(advanceTime(23, 20, DEFAULT_LIGHTING), 1);
    assert.equal(advanceTime(12, 240, DEFAULT_LIGHTING), 12);
    assert.equal(advanceTime(12, 30, { ...DEFAULT_LIGHTING, cycleSeconds: 60 }), 0);
});

test('manual mode holds the selected time regardless of elapsed time', () => {
    assert.equal(advanceTime(18, 600, { ...DEFAULT_LIGHTING, automatic: false }), 18);
    assert.equal(advanceTime(12, -10, DEFAULT_LIGHTING), 12);
});

test('daylight peaks at midday, vanishes at night and transitions continuously', () => {
    assert.equal(daylightAt(12), 1);
    assert.equal(daylightAt(0), 0);
    assert.ok(daylightAt(6) > 0 && daylightAt(6) < 1);
    assert.ok(Math.abs(daylightAt(5.999) - daylightAt(6.001)) < 0.01);
    assert.ok(Math.abs(daylightAt(17.999) - daylightAt(18.001)) < 0.01);
    assert.ok(Math.abs(daylightAt(24) - daylightAt(0)) < 0.001);
});

test('clock labels handle midnight, negative time and minute boundaries', () => {
    assert.equal(formatTime(24), '00:00');
    assert.equal(formatTime(-0.5), '23:30');
    assert.equal(formatTime(6.5), '06:30');
    assert.equal(wrapTime(49), 1);
});
