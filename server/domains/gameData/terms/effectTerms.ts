import type { EffectOp } from '../types/datasets'
import type { EffectTerm } from './types'
import { capitalize, fmt, pctChange, withUnit } from './format'

export const EFFECT_TERMS: Record<string, EffectTerm> = {
    JumpSpeed: { category: 'jump', label: 'jump speed' },
    JumpSpeedScale: { category: 'jump', label: 'spike jump strength' },
    GlideCap: { category: 'jump', label: 'spike-jump glide speed cap', describe: v => `Spike-jump glide speed cap raised to ${fmt(v)}` },
    GlideScale: { category: 'jump', label: 'glide strength', describe: v => `Increased glide strength by ${pctChange(v)}%` },

    WalkSpeed: { category: 'movement', label: 'walk speed' },
    SprintBonus: { category: 'movement', label: 'sprint bonus' },
    SprintCap: { category: 'movement', label: 'sprint speed cap' },
    WalkSpeedPin: { category: 'movement', label: 'movement speed', describe: v => `Movement speed locked at ${fmt(v)}, sprint off` },

    ReachWidth: { category: 'attack', label: 'attack hitbox width' },
    ReachHeight: { category: 'attack', label: 'attack hitbox height' },
    ReachDepth: { category: 'attack', label: 'attack hitbox depth' },
    ReachCoreHeight: { category: 'attack', label: 'attack hitbox core height' },
    ReachLift: { category: 'attack', label: 'attack hitbox position', describe: v => `Attack hitbox sits ${fmt(v)} higher` },
    ReachHeightScale: { category: 'attack', label: 'attack hitbox height' },
    ArmScale: { category: 'attack', label: 'arm length', describe: v => `Arms ${pctChange(v)}% longer` },
    AttackPower: { category: 'attack', label: 'attack power' },
    MaxPower: { category: 'attack', label: 'max power', describe: v => `Max power raised to ${fmt(v)}` },
    JumpWindup: { category: 'attack', label: 'spike windup', unit: 's' },
    JumpWindupAfter: { category: 'attack', label: 'follow-up spike windup', unit: 's', guess: true },
    JumpWindupOverride: { category: 'attack', label: 'spike windup', unit: 's', describe: v => `Spike windup fixed at ${fmt(v)}s` },

    BlockWidth: { category: 'block', label: 'block width' },
    BlockHeight: { category: 'block', label: 'block height' },
    BlockDepth: { category: 'block', label: 'block depth' },
    BlockSideReach: { category: 'block', label: 'angled block reach' },
    BlockSideRoll: { category: 'block', label: 'angled block tilt', unit: '°' },
    BlockChargeFast: { category: 'block', label: 'block charge speed', describe: () => 'Faster block charge' },
    BlockChargeSlow: { category: 'block', label: 'block charge speed', describe: () => 'Slower block charge' },
    BlockGlideCap: { category: 'block', label: 'block-jump glide speed cap', describe: v => `Block-jump glide speed cap raised to ${fmt(v)}` },
    BlockPose: { category: 'block', label: 'block pose', describe: () => 'Blocks with the V pose' },

    DigWidth: { category: 'receive', label: 'receive width' },
    DigDepth: { category: 'receive', label: 'receive depth' },
    DigHeightScale: { category: 'receive', label: 'receive hitbox height' },
    DiveWidth: { category: 'receive', label: 'dive width' },
    DiveHeight: { category: 'receive', label: 'dive height' },
    DiveDepth: { category: 'receive', label: 'dive depth' },
    DiveDistanceScale: { category: 'receive', label: 'dive distance' },

    AnySetReach: { category: 'set', label: 'set hitbox on every set' },
    SetReach: { category: 'set', label: 'setter mode hitbox' },

    Stamina: { category: 'stamina', label: 'max stamina' },
}

export function describeEffectGeneric(label: string, amount: number, op: EffectOp, unit?: string): string {
    if (op === 'set') return `${capitalize(label)} set to ${withUnit(amount, unit)}`
    if (op === 'scale') return `${amount >= 1 ? 'Increased' : 'Reduced'} ${label} by ${pctChange(amount)}%`
    return `${amount >= 0 ? 'Increased' : 'Reduced'} ${label} by ${withUnit(Math.abs(amount), unit)}`
}
