import { describe, expect, it } from 'vitest'
import { versionWindow } from '../versionWindow'

describe('versionWindow', () => {
    it('shows everything when there are fewer versions than the window', () => {
        expect(versionWindow(5, 3)).toEqual({ start: 0, end: 5 })
        expect(versionWindow(9, 8)).toEqual({ start: 0, end: 9 })
    })

    it('centers the current version with four on each side', () => {
        expect(versionWindow(15, 9)).toEqual({ start: 5, end: 14 })
        expect(versionWindow(15, 7)).toEqual({ start: 3, end: 12 })
    })

    it('pins the window to the newest end', () => {
        expect(versionWindow(15, 0)).toEqual({ start: 0, end: 9 })
        expect(versionWindow(15, 3)).toEqual({ start: 0, end: 9 })
    })

    it('pins the window to the oldest end', () => {
        expect(versionWindow(15, 14)).toEqual({ start: 6, end: 15 })
        expect(versionWindow(15, 11)).toEqual({ start: 6, end: 15 })
    })

    it('starts at the newest when the current version is unknown', () => {
        expect(versionWindow(15, -1)).toEqual({ start: 0, end: 9 })
    })

    it('returns an empty window for no versions', () => {
        expect(versionWindow(0, -1)).toEqual({ start: 0, end: 0 })
    })
})
