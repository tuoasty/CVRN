"use client";

import {useEffect, useState} from "react";
import {useTheme} from "next-themes";
import {drawerLabelClass, drawerRowClass, rowStyle} from "./IslandDrawer";

const THEMES = [
    {value: "light", label: "Light"},
    {value: "dark", label: "Dark"},
    {value: "system", label: "System"},
] as const;

export function ThemeDrawer({onPick}: {onPick(): void}) {
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    return (
        <div className="py-1.5">
            {THEMES.map((option, index) => {
                const current = mounted && theme === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={current}
                        onClick={() => {
                            setTheme(option.value);
                            onPick();
                        }}
                        className={drawerRowClass("desktop", current)}
                        style={rowStyle(index)}
                    >
                        <span className={drawerLabelClass(current)}>{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
