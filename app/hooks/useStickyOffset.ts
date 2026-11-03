"use client";

import {useEffect, useState} from "react";

export function useStickyOffset() {
    const [top, setTop] = useState(0);
    useEffect(() => {
        const header = document.querySelector("header");
        if (!header) return;
        const update = () => setTop(header.getBoundingClientRect().height);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(header);
        return () => observer.disconnect();
    }, []);
    return top;
}
