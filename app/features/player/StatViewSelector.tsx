"use client";

import {cn} from "@/lib/utils";
import {ViewTabs} from "@/app/components/filters/ViewTabs";
import {StatView, STAT_VIEWS} from "./playerStatColumnMeta";

type Props = {
    value: StatView;
    onChange: (v: StatView) => void;
    className?: string;
};

export default function StatViewSelector({value, onChange, className}: Props) {
    return (
        <ViewTabs
            label="Stat view"
            tabs={STAT_VIEWS}
            value={value}
            onChange={onChange}
            density="compact"
            className={cn("w-fit max-w-full", className)}
        />
    );
}
