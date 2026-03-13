'use server';

import {readSheetRange} from "@/server/utils/googleSheets";

export async function testSheetConnection() {
    try {
        const sheetId = process.env.GOOGLE_SHEET_ID;
        const sheetName = process.env.GOOGLE_SHEET_NAME || 'Playoffs';

        if (!sheetId) {
            return {
                success: false,
                error: 'GOOGLE_SHEET_ID not configured',
            };
        }

        const data = await readSheetRange(sheetId, sheetName, 'A1:Z50');

        return {
            success: true,
            data,
            rowCount: data.length,
            sheetId,
            sheetName,
        };
    } catch (error) {
        console.error('Sheet connection test failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}