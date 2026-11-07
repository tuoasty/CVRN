import type {LandingView} from "./LandingExperience";

export const WHEEL_GAP_MS = 200;
export const SETTLE_MS = 250;
export const MIN_DELTA = 4;
export const NOTCH_DELTA = 50;
export const ACCEL_RATIO = 2;
export const ACCEL_MIN = 8;
export const FADE_MS = 300;

const LINE_PX = 16;
const PAGE_PX = 800;

export interface WheelState {
    lastWheelAt: number;
    lastDelta: number;
    gestureFromTop: boolean;
    consumed: boolean;
}

export const INITIAL_WHEEL: WheelState = {lastWheelAt: -Infinity, lastDelta: 0, gestureFromTop: false, consumed: false};

export type ViewIntent = "league" | "menu" | null;

interface WheelInput {
    deltaY: number;
    deltaMode: number;
    now: number;
    scrollY: number;
    atTopFor: number;
    view: LandingView;
}

interface WheelResult {
    state: WheelState;
    intent: ViewIntent;
    swallow: boolean;
}

function toPixels(deltaY: number, deltaMode: number) {
    if (deltaMode === 1) return deltaY * LINE_PX;
    if (deltaMode === 2) return deltaY * PAGE_PX;
    return deltaY;
}

export function nextWheel(state: WheelState, e: WheelInput): WheelResult {
    const delta = toPixels(e.deltaY, e.deltaMode);
    const size = Math.abs(delta);
    const atTop = e.scrollY <= 1;
    const continuous = e.now - state.lastWheelAt <= WHEEL_GAP_MS && Math.sign(delta) === Math.sign(state.lastDelta);
    const base = {lastWheelAt: e.now, lastDelta: delta};

    if (state.consumed && continuous) {
        return {state: {...state, ...base}, intent: null, swallow: true};
    }

    const notch = e.deltaMode !== 0 || size >= NOTCH_DELTA;
    const accelerated = size >= ACCEL_MIN && size >= ACCEL_RATIO * Math.abs(state.lastDelta);
    const boundary = !continuous || notch || accelerated;
    const settled = atTop && e.atTopFor >= SETTLE_MS;
    const next: WheelState = {...base, gestureFromTop: boundary ? settled : state.gestureFromTop, consumed: false};

    if (size < MIN_DELTA) return {state: next, intent: null, swallow: false};

    if (e.view === "menu" && delta < 0 && atTop && next.gestureFromTop) {
        return {state: {...next, consumed: true}, intent: "league", swallow: true};
    }

    if (e.view === "league" && delta > 0) {
        return {state: {...next, consumed: true}, intent: "menu", swallow: true};
    }

    return {state: next, intent: null, swallow: false};
}

interface KeyInput {
    key: string;
    view: LandingView;
    scrollY: number;
    targetIsInteractive: boolean;
}

export function keyIntent(e: KeyInput): ViewIntent {
    if (e.targetIsInteractive) return null;
    if (e.view === "menu" && e.scrollY <= 1 && (e.key === "PageUp" || e.key === "ArrowUp")) return "league";
    if (e.view === "league" && (e.key === "PageDown" || e.key === "ArrowDown")) return "menu";
    return null;
}
