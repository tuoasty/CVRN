export function watchHeaderHeight(
    findHeader: () => Element | null,
    onHeight: (height: number) => void,
): () => void {
    let observed: Element | null = null;

    const sync = () => {
        const header = findHeader();
        if (header !== observed) {
            if (observed) observer.unobserve(observed);
            if (header) observer.observe(header);
            observed = header;
        }
        onHeight(header ? header.getBoundingClientRect().height : 0);
    };

    const observer = new ResizeObserver(sync);
    sync();
    return () => observer.disconnect();
}
