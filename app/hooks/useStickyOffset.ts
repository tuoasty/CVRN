"use client";

import {useEffect, useState} from "react";
import {watchHeaderHeight} from "./watchHeaderHeight";

export function useStickyOffset() {
    const [top, setTop] = useState(0);
    useEffect(() => watchHeaderHeight(() => document.querySelector("header"), setTop), []);
    return top;
}
