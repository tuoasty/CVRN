import type { Database as GeneratedDB } from "./database.types";

type FixBigInt<T> = {
    [K in keyof T]: T[K] extends number
        ? string
        : T[K] extends object
            ? FixBigInt<T[K]>
            : T[K];
};

export type Database = FixBigInt<GeneratedDB>;
