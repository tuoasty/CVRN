"use client";

import {useId, type ComponentProps, type ReactNode} from "react";
import {cn} from "@/lib/utils";
import {isAllSelected, isOptionSelected, toggleOptionValue, type OptionSelection} from "./optionSelection";

type Density = "comfortable" | "compact";

const DENSITY: Record<Density, {pad: string; bar: string; divider: string}> = {
    comfortable: {pad: "px-2.5", bar: "after:left-2.5 after:right-2.5", divider: "mx-1.5"},
    compact: {pad: "px-2", bar: "after:left-2 after:right-2", divider: "mx-1"},
};

type OptionButtonProps = ComponentProps<"button"> & {selected: boolean; density?: Density};

export function OptionButton({selected, density = "comfortable", className, type = "button", ...props}: OptionButtonProps) {
    return (
        <button
            type={type}
            className={cn(
                "relative inline-flex h-8 shrink-0 items-center text-sm transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                DENSITY[density].pad,
                selected
                    ? cn(
                          "font-semibold text-foreground",
                          "after:absolute after:bottom-0.5 after:h-0.5 after:bg-foreground",
                          DENSITY[density].bar,
                      )
                    : "font-medium text-muted-foreground hover:text-foreground",
                className,
            )}
            {...props}
        />
    );
}

export type FilterOption<T extends string> = {value: T; label: ReactNode; title?: string};

type Layout = "stacked" | "inline";

type BaseProps<T extends string> = {
    label: string;
    options: readonly FilterOption<T>[];
    allOption?: {label: string};
    mono?: boolean;
    layout?: Layout;
    trailing?: ReactNode;
    className?: string;
};

type SingleProps<T extends string> = BaseProps<T> & {
    multi?: false;
    value: T | null;
    onChange: (value: T | null) => void;
};

type MultiProps<T extends string> = BaseProps<T> & {
    multi: true;
    values: readonly T[];
    onChange: (values: T[]) => void;
};

export type OptionRowProps<T extends string> = SingleProps<T> | MultiProps<T>;

export function OptionRow<T extends string>(props: OptionRowProps<T>) {
    const {label, options, allOption, mono, layout = "stacked", trailing, className} = props;
    const labelId = useId();
    const density: Density = layout === "stacked" ? "comfortable" : "compact";
    const selection: OptionSelection<T> = props.multi
        ? {multi: true, values: props.values}
        : {multi: false, value: props.value};
    const allSelected = isAllSelected(selection);

    const selectAll = () => {
        if (props.multi) {
            if (props.values.length > 0) props.onChange([]);
        } else if (props.value !== null) {
            props.onChange(null);
        }
    };

    const select = (value: T) => {
        if (props.multi) props.onChange(toggleOptionValue(props.values, value));
        else if (props.value !== value) props.onChange(value);
    };

    const labelEl = (
        <span id={labelId} className={cn("text-xs font-semibold text-muted-foreground", layout === "inline" && "mr-1")}>
            {label}
        </span>
    );

    const row = (
        <div
            role="group"
            aria-labelledby={labelId}
            className={cn("flex min-w-0 flex-wrap items-center gap-0.5", layout === "stacked" && className)}
        >
            {allOption && (
                <>
                    <OptionButton density={density} selected={allSelected} aria-pressed={allSelected} onClick={selectAll}>
                        {allOption.label}
                    </OptionButton>
                    <span aria-hidden className={cn("h-4 w-px bg-border", DENSITY[density].divider)} />
                </>
            )}
            {options.map(option => {
                const selected = isOptionSelected(selection, option.value);
                const aria = props.multi
                    ? {role: "checkbox" as const, "aria-checked": selected}
                    : {"aria-pressed": selected};
                return (
                    <OptionButton
                        key={option.value}
                        density={density}
                        selected={selected}
                        title={option.title}
                        className={cn(mono && "font-mono tabular-nums")}
                        onClick={() => select(option.value)}
                        {...aria}
                    >
                        {option.label}
                    </OptionButton>
                );
            })}
            {trailing}
        </div>
    );

    if (layout === "stacked") {
        return (
            <>
                {labelEl}
                {row}
            </>
        );
    }

    return (
        <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
            {labelEl}
            {row}
        </div>
    );
}
