"use client";

import * as React from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";
import {DayPicker} from "react-day-picker";
import {cn} from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({className, classNames, showOutsideDays = true, ...props}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "relative flex flex-col sm:flex-row gap-4",
                month: "flex flex-col gap-3",
                month_caption: "flex h-8 items-center justify-center",
                caption_label: "text-sm font-semibold",
                nav: "absolute inset-x-0 top-0 flex items-center justify-between",
                button_previous:
                    "inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                button_next:
                    "inline-flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-40 focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "w-9 text-xs font-medium text-muted-foreground",
                week: "mt-1 flex w-full",
                day: "relative h-9 w-9 p-0 text-center text-sm tabular-nums focus-within:relative focus-within:z-20",
                day_button:
                    "inline-flex h-9 w-9 items-center justify-center rounded-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                range_start:
                    "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
                range_end:
                    "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
                range_middle:
                    "[&>button]:bg-primary/15 [&>button]:text-foreground [&>button]:hover:bg-primary/25 [&>button]:hover:text-foreground",
                selected: "[&>button]:bg-primary [&>button]:text-primary-foreground",
                today: "[&>button]:font-bold",
                outside: "text-muted-foreground/40",
                disabled: "text-muted-foreground/30",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({orientation}) =>
                    orientation === "left" ? (
                        <ChevronLeft className="h-4 w-4" aria-hidden />
                    ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    ),
            }}
            {...props}
        />
    );
}
