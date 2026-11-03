import {unstable_rethrow} from "next/navigation";
import {logger} from "@/server/utils/logger";

export async function readOrEmpty<T>(read: Promise<T[]>, label: string): Promise<T[]> {
    try {
        return await read;
    } catch (error) {
        unstable_rethrow(error);
        logger.error({error, label}, "Optional read failed; rendering without it");
        return [];
    }
}
