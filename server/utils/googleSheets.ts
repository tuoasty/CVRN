import { google } from 'googleapis';

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

type SheetColor = { red?: number; green?: number; blue?: number };

function colorToHex(color: SheetColor): string {
    const r = Math.round((color.red ?? 0) * 255).toString(16).padStart(2, '0');
    const g = Math.round((color.green ?? 0) * 255).toString(16).padStart(2, '0');
    const b = Math.round((color.blue ?? 0) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

function isWhiteOrDefault(color: SheetColor | null | undefined): boolean {
    if (!color) return true;
    const r = color.red ?? 1;
    const g = color.green ?? 1;
    const b = color.blue ?? 1;
    return r > 0.97 && g > 0.97 && b > 0.97;
}

export type SheetRangeWithColors = {
    values: string[][];
    bgColors: (string | null)[][];
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
        fields: 'sheets.data.rowData.values(formattedValue,effectiveFormat.backgroundColor)',
    });

    const rowDataArr = response.data.sheets?.[0]?.data?.[0]?.rowData ?? [];
    const values: string[][] = [];
    const bgColors: (string | null)[][] = [];

    for (const rowData of rowDataArr) {
        const cellValues: string[] = [];
        const cellColors: (string | null)[] = [];
        for (const cell of rowData.values ?? []) {
            cellValues.push(cell.formattedValue ?? '');
            const bg = cell.effectiveFormat?.backgroundColor as SheetColor | null | undefined;
            cellColors.push(isWhiteOrDefault(bg) ? null : colorToHex(bg!));
        }
        values.push(cellValues);
        bgColors.push(cellColors);
    }

    return { values, bgColors };
}