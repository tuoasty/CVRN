import { OverallPosition, OverallScaling, OverallScalingSet, CategoryWeights } from '../types'

const BASE = { floor: 45, ceil: 99, curve: 1 }

const DEFAULT_WEIGHTS: Record<OverallPosition, CategoryWeights> = {
    OUT: { scoring: 20, spiking: 30, setting: 5,  blocking: 10, receiving: 25, serving: 10 },
    OPP: { scoring: 20, spiking: 35, setting: 5,  blocking: 20, receiving: 10, serving: 10 },
    MID: { scoring: 15, spiking: 25, setting: 0,  blocking: 45, receiving: 5,  serving: 10 },
    SET: { scoring: 5,  spiking: 5,  setting: 50, blocking: 15, receiving: 10, serving: 15 },
    LIB: { scoring: 0,  spiking: 0,  setting: 15, blocking: 0,  receiving: 70, serving: 15 },
}

export const NEUTRAL_SCALING: Omit<OverallScaling, 'position'> = {
    ...BASE,
    weights: { scoring: 17, spiking: 17, setting: 17, blocking: 17, receiving: 16, serving: 16 },
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
