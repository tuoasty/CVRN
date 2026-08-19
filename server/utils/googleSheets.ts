import { google } from 'googleapis';

export function extractSheetId(input: string): string {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : trimmed;
}

export function getGoogleSheetsClient() {
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;

    if (!credentials) {
        throw new Error('GOOGLE_SHEETS_CREDENTIALS not found in environment variables');
    }

    let parsedCredentials;
    try {
        parsedCredentials = JSON.parse(credentials);
    } catch {
        throw new Error('Invalid GOOGLE_SHEETS_CREDENTIALS format');
    }

    const auth = new google.auth.GoogleAuth({
        credentials: parsedCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
}

export async function readSheetRange(
    sheetId: string,
    sheetName: string,
    range: string = 'A1:ZZ500'
) {
    const sheets = getGoogleSheetsClient();
    const fullRange = `${sheetName}!${range}`;

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: fullRange,
    });

    return response.data.values || [];
}

export async function listSheetTitles(sheetId: string): Promise<string[]> {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        fields: 'sheets.properties.title',
    });

    return (response.data.sheets ?? [])
        .map(s => s.properties?.title ?? '')
        .filter(Boolean);
}

type SheetColor = { red?: number; green?: number; blue?: number };

function colorToHex(color: SheetColor): string {
    const r = Math.round((color.red ?? 0) * 255).toString(16).padStart(2, '0');
    const g = Math.round((color.green ?? 0) * 255).toString(16).padStart(2, '0');
    const b = Math.round((color.blue ?? 0) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}
export type SheetRangeWithColors = {
    values: string[][];
    bgColors: (string | null)[][];
    fgColors: (string | null)[][];
};

export async function readSheetRangeWithColors(
    sheetId: string,
    sheetName: string,
    range: string = 'A1:ZZ500'
): Promise<SheetRangeWithColors> {
    const sheets = getGoogleSheetsClient();

    const response = await sheets.spreadsheets.get({
        spreadsheetId: sheetId,
        ranges: [`${sheetName}!${range}`],
        includeGridData: true,
        fields: 'sheets.data.rowData.values(formattedValue,effectiveFormat.backgroundColor,effectiveFormat.textFormat.foregroundColor)',
    });

    const rowDataArr = response.data.sheets?.[0]?.data?.[0]?.rowData ?? [];
    const values: string[][] = [];
    const bgColors: (string | null)[][] = [];
    const fgColors: (string | null)[][] = [];

    for (const rowData of rowDataArr) {
        const cellValues: string[] = [];
        const cellBgColors: (string | null)[] = [];
        const cellFgColors: (string | null)[] = [];
        for (const cell of rowData.values ?? []) {
            cellValues.push(cell.formattedValue ?? '');
            const bg = cell.effectiveFormat?.backgroundColor as SheetColor | null | undefined;
            cellBgColors.push(bg ? colorToHex(bg) : null);
            const fg = (cell.effectiveFormat?.textFormat as { foregroundColor?: SheetColor } | null | undefined)?.foregroundColor;
            cellFgColors.push(fg ? colorToHex(fg) : null);
        }
        values.push(cellValues);
        bgColors.push(cellBgColors);
        fgColors.push(cellFgColors);
    }

    return { values, bgColors, fgColors };
}