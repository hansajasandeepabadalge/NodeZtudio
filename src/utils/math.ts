/** Linearly interpolate between a and b by t. */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Clamp value between min and max. */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
