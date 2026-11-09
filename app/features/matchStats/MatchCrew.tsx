import {Fragment} from "react";
import Link from "next/link";
import type {MatchDetail} from "@/server/domains/match";
import {buildPublicPlayerHref} from "@/app/utils/matchDetailHref";

type Official = MatchDetail["officials"][number];

function Names({people}: {people: Official[]}) {
    return (
        <span>
            {people.map((p, i) => {
                const href = buildPublicPlayerHref(p.username);
                const name = p.display_name || p.username || "Unknown";
                return (
                    <Fragment key={p.id}>
                        {i > 0 && ", "}
                        {href ? (
                            <Link href={href} prefetch={false} className="underline underline-offset-4 hover:decoration-2">{name}</Link>
                        ) : name}
                    </Fragment>
                );
            })}
        </span>
    );
}

export default function MatchCrew({officials}: {officials: Official[]}) {
    const referees = officials.filter(o => o.official_type === "referee");
    const media = officials.filter(o => o.official_type === "media");
    if (referees.length === 0 && media.length === 0) return null;
    const key = "text-[11px] font-medium uppercase tracking-wider text-muted-foreground";
    return (
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {referees.length > 0 && (
                <div className="flex items-baseline gap-2">
                    <span className={key}>{referees.length === 1 ? "Referee" : "Referees"}</span>
                    <Names people={referees} />
                </div>
            )}
            {media.length > 0 && (
                <div className="flex items-baseline gap-2">
                    <span className={key}>Media</span>
                    <Names people={media} />
                </div>
            )}
        </div>
    );
}
