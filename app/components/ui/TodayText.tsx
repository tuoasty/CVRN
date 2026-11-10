import type {ReactNode} from "react";

export function TodayText({active, children}: {active: boolean; children: ReactNode}) {
    if (!active) return <>{children}</>;
    return <span className="bg-today px-1 font-semibold text-black dark:bg-transparent dark:px-0 dark:text-today">{children}</span>;
}
