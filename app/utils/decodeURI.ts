import {clientLogger} from "@/app/utils/clientLogger";

export function safeDecodeURIComponent(str: string): string {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        clientLogger.error('TeamDetailPage', 'Failed to decode URI component', { str, error: e });
        return str;
    }
}