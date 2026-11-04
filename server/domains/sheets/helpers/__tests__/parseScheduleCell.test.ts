import { describe, expect, it } from 'vitest';
import { parsePlayoffScheduleCell, parseScheduleCell } from '../parseScheduleCell';

const iso = (value: string, year = 2026) => parseScheduleCell(value, year)?.iso ?? null;
const playoffIso = (value: string, year = 2026) => parsePlayoffScheduleCell(value, year)?.iso ?? null;

describe('parseScheduleCell', () => {
    it.each([
        ['November 8th, 20:00 UTC', '2026-11-08T20:00:00.000Z'],
        ['November 8th, 8:00 PM UTC', '2026-11-08T20:00:00.000Z'],
        ['November 8th, 12:00 AM UTC', '2026-11-08T00:00:00.000Z'],
        ['November 8th, 20:00 [UTC]', '2026-11-08T20:00:00.000Z'],
        ['November 8th, 20:00 UTC+8', '2026-11-08T12:00:00.000Z'],
        ['November 8th, 20:00 [UTC-3]', '2026-11-08T23:00:00.000Z'],
    ])('reads UTC from %s', (value, expected) => {
        expect(iso(value)).toBe(expected);
    });

    it.each([
        ['November 8th, 20:00 UTC (AS)', '2026-11-08T20:00:00.000Z'],
        ['November 8th, 20:00 UTC - moved', '2026-11-08T20:00:00.000Z'],
        ['November 8th, 20:00 UTC (2nd leg)', '2026-11-08T20:00:00.000Z'],
        ['November 8th, 8:00 PM [GMT+8] (AS)', '2026-11-08T12:00:00.000Z'],
        ['November 8th, 8:00 PM GMT (+8) rematch', '2026-11-08T12:00:00.000Z'],
        ['November 8th, 8:00 PM EST (NA)', '2026-11-09T01:00:00.000Z'],
    ])('ignores text after the timezone in %s', (value, expected) => {
        expect(iso(value)).toBe(expected);
    });

    it.each([
        ['(AS) November 8th, 20:00 UTC', '2026-11-08T20:00:00.000Z'],
        ['Week 3, November 8th, 20:00 UTC', '2026-11-08T20:00:00.000Z'],
        ['Sat November 8th, 8:00 PM [GMT+8]', '2026-11-08T12:00:00.000Z'],
    ])('ignores text before the date in %s', (value, expected) => {
        expect(iso(value)).toBe(expected);
    });

    it.each([
        ['May 2nd, 5:00 PM [GMT+8]', '2026-05-02T09:00:00.000Z'],
        ['May 2nd, 5:00 PM GMT (+8)', '2026-05-02T09:00:00.000Z'],
        ['May 2nd, 5:00 PM [GMT+5.5]', '2026-05-02T11:30:00.000Z'],
        ['May 2nd, 5:00 PM [GMT-3]', '2026-05-02T20:00:00.000Z'],
        ['January 2nd, 5:00 PM PST', '2026-01-03T01:00:00.000Z'],
        ['July 2nd, 5:00 PM BRT', '2026-07-02T20:00:00.000Z'],
        ['July 2nd, 5:00 PM UK', '2026-07-02T16:00:00.000Z'],
        ['January 2nd, 5:00 PM GMT', '2026-01-02T17:00:00.000Z'],
        ['May 2nd', '2026-05-02T00:00:00.000Z'],
        ['May 2nd - May 5th', '2026-05-02T00:00:00.000Z'],
    ])('keeps the existing format %s', (value, expected) => {
        expect(iso(value)).toBe(expected);
    });

    it.each([
        ['November 8th, 8:00 PM GMT+8', '2026-11-08T12:00:00.000Z'],
        ['November 8th, 8:00 PM GMT+5:30', '2026-11-08T14:30:00.000Z'],
    ])('does not read %s as bare GMT', (value, expected) => {
        expect(iso(value)).toBe(expected);
    });

    it.each([
        'November 8th, 20:00',
        'November 8th, 20:00 (AS)',
        'November 8th, 20:00 WIB',
        'November 8th, 20 UTC',
        'November 8th, 25:00 UTC',
        'November 8th, 20:61 UTC',
        'November 8th, 13:00 PM UTC',
        'November 31st, 20:00 UTC',
        'November 8th, 20:00 UTC 8',
        'November 8th, 20:00 GMT 8',
        'November 8th, 20:00 GMT+99',
        'November 8th, 20:00 EST+8',
        'Week 3, 20:00 UTC',
        'TBD',
    ])('rejects %s', (value) => {
        expect(iso(value)).toBeNull();
    });

    it('returns null for an empty cell', () => {
        expect(iso('   ')).toBeNull();
    });
});

describe('parsePlayoffScheduleCell', () => {
    it.each([
        ['Date: 11/8/2026 8 PM GMT+8', '2026-11-08T12:00:00.000Z'],
        ['Date: 11/8/2026 8:30 PM GMT (+8)', '2026-11-08T12:30:00.000Z'],
        ['Date: 11/8/2026 8 PM UTC', '2026-11-08T20:00:00.000Z'],
        ['Date: 11/8/2026 20:00 UTC (AS)', '2026-11-08T20:00:00.000Z'],
        ['Date: 11/8/2026 8 PM GMT+8 (AS)', '2026-11-08T12:00:00.000Z'],
        ['Date: November 8th, 20:00 UTC (AS)', '2026-11-08T20:00:00.000Z'],
        ['Date: November 8th, 5:00 PM PST', '2026-11-09T01:00:00.000Z'],
        ['Date: May 2nd', '2026-05-02T00:00:00.000Z'],
    ])('reads %s', (value, expected) => {
        expect(playoffIso(value)).toBe(expected);
    });

    it.each(['Date: 13/8/2026 8 PM UTC', 'Date: 2/30/2026 8 PM UTC', 'Date:'])('rejects %s', (value) => {
        expect(playoffIso(value)).toBeNull();
    });
});
