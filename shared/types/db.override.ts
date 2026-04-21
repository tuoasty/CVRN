import type {Database as GeneratedDB} from "@/database.types";

type FixBigInt<T> = {
    [K in keyof T]: K extends 'roblox_user_id'
        ? T[K] extends number
            ? string
            : T[K]
        : T[K] extends object
            ? FixBigInt<T[K]>
            : T[K];
};

export type Database = FixBigInt<GeneratedDB>;
