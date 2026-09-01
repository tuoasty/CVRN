import Link from "next/link";
import {SPEC_POSITIONS} from "@/server/domains/spec/types";
import {cn} from "@/lib/utils";

const SHORT: Record<string, string> = {
    OUT: "Outside",
    OPP: "Opposite",
    MID: "Middle",
    SET: "Setter",
    LIB: "Libero",
};

export default function PositionTabs({active}: {active: string}) {
    return (
        <div className="flex w-max border border-border">
            {SPEC_POSITIONS.map(p => (
                <Link
                    key={p.code}
                    href={`?pos=${p.code.toLowerCase()}`}
                    scroll={false}
                    className={cn(
                        "flex h-[38px] items-center border-r border-border px-[18px] text-sm font-medium last:border-r-0",
                        active === p.code
                            ? "bg-secondary font-semibold text-secondary-foreground"
                            : "bg-card text-muted-foreground hover:text-foreground",
                    )}
                >
                    {SHORT[p.code] ?? p.label}
                </Link>
            ))}
        </div>
    );
}
