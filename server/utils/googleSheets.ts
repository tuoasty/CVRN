import { google } from 'googleapis';

export function getGoogleSheetsClient() {
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS;

    if (!credentials) {
        throw new Error('GOOGLE_SHEETS_CREDENTIALS not found in environment variables');
    }

    let parsedCredentials;
    try {
        parsedCredentials = JSON.parse(credentials);
    } catch (error) {
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