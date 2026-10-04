'use client';

import {useEffect} from 'react';

export function useLeaveGuard(active: boolean, onBlocked: (href: string) => void) {
    useEffect(() => {
        if (!active) return;

        const beforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };

        const click = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
            if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
            const url = new URL(anchor.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            onBlocked(url.pathname + url.search + url.hash);
        };

        window.addEventListener('beforeunload', beforeUnload);
        document.addEventListener('click', click, true);
        return () => {
            window.removeEventListener('beforeunload', beforeUnload);
            document.removeEventListener('click', click, true);
        };
    }, [active, onBlocked]);
}
