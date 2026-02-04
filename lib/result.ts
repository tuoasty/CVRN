import {SerializableError} from "@/lib/error/serializeableError";

export type Result<T, E = SerializableError> = | { ok: true; value: T}
| {ok: false; error: E};

export const Ok = <T>(value:T): Result<T> => ({ok: true, value});
export const Err = <E = SerializableError>(error:E): Result<never, E> => ({ok:false, error
})