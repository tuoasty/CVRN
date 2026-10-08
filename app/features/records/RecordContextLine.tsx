import {Fragment, type ReactNode} from "react";
import Link from "next/link";
import {cn} from "@/lib/utils";
import type {RecordEntry} from "@/server/domains/record";
import {recordContext, type RecordContextPiece} from "./recordContext";
const MUTED_LINK =
    "underline-offset-[3px] hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline focus-visible:decoration-2 focus-visible:outline-none";

export function Num({children}: {children: ReactNode}) {
    return <span className="font-mono tabular-nums">{children}</span>;
}

export function Dot() {
    return (
        <span aria-hidden className="mx-1 text-muted-foreground/60">
            ·
        </span>
    );
}

function Piece({piece}: {piece: RecordContextPiece}) {
    switch (piece.kind) {
        case "match": {
            const body = (
                <>
                    {piece.opponent && (
                        <>
                            vs {piece.opponent}
                            <Dot />
                        </>
                    )}
                    {piece.round && (
                        <>
                            {piece.round}
                            <Dot />
                        </>
                    )}
                    {piece.detail === "set" ? (
                        <>
                            Set <Num>{piece.count}</Num>
                        </>
                    ) : (
                        <>
                            <Num>{piece.count}</Num> sets
                        </>
                    )}
                </>
            );
            return piece.href ? (
                <Link href={piece.href} title={piece.title ?? undefined} className={MUTED_LINK}>
                    {body}
                </Link>
            ) : (
                <span title={piece.title ?? undefined}>{body}</span>
            );
        }
        case "scope":
            return (
                <>
                    {piece.regionCode} S<Num>{piece.seasonNumber ?? "?"}</Num>
                </>
            );
        case "tally":
            return (
                <>
                    <Num>{piece.count}</Num> {piece.unit}
                </>
            );
        case "inProgress":
            return <>in progress</>;
    }
}

export function RecordContextLine({entry, className}: {entry: RecordEntry; className?: string}) {
    const pieces = recordContext(entry);
    return (
        <p className={cn("min-w-0 truncate text-xs leading-4 text-muted-foreground", className)}>
            {pieces.map((piece, index) => (
                <Fragment key={index}>
                    {index > 0 && <Dot />}
                    <Piece piece={piece} />
                </Fragment>
            ))}
        </p>
    );
}
