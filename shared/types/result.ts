import {SerializableError} from "@/server/utils/serializeableError";

export type Result<T, E = SerializableError> = | { ok: true; value: T}
| {ok: false; error: E};

export const Ok = <T>(value:T): Result<T> => ({ok: true, value});
export const Err = (error: SerializableError): Result<never, SerializableError> => ({ok: false, error});
