import { OverallPosition, OverallScaling, OverallScalingSet, CategoryWeights } from '../types'

const BASE = { floor: 45, ceil: 99, curve: 1 }

const DEFAULT_WEIGHTS: Record<OverallPosition, CategoryWeights> = {
    OUT: { scoring: 2,   spiking: 3,   setting: 0.5, blocking: 1,   receiving: 2,   serving: 1 },
    OPP: { scoring: 2,   spiking: 3,   setting: 0.5, blocking: 1.5, receiving: 1,   serving: 1 },
    MID: { scoring: 1.5, spiking: 2,   setting: 0,   blocking: 3,   receiving: 0.5, serving: 1 },
    SET: { scoring: 0.5, spiking: 0.5, setting: 4,   blocking: 1,   receiving: 1,   serving: 1 },
    LIB: { scoring: 0,   spiking: 0,   setting: 1,   blocking: 0,   receiving: 4,   serving: 1 },
}

export const NEUTRAL_SCALING: Omit<OverallScaling, 'position'> = {
    ...BASE,
    weights: { scoring: 1, spiking: 1, setting: 1, blocking: 1, receiving: 1, serving: 1 },
}

export function defaultScalingFor(position: OverallPosition): OverallScaling {
    return { position, ...BASE, weights: { ...DEFAULT_WEIGHTS[position] } }
}

export function defaultScalingSet(): OverallScalingSet {
    return {
        OUT: defaultScalingFor('OUT'),
        OPP: defaultScalingFor('OPP'),
        MID: defaultScalingFor('MID'),
        SET: defaultScalingFor('SET'),
        LIB: defaultScalingFor('LIB'),
    }
}
