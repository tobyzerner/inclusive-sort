export function isScrollable(el: Element) {
    return (
        /auto|scroll/.test(getComputedStyle(el).overflow) ||
        el === document.scrollingElement
    );
}

export function getScrollableAncestors(el: Element) {
    let node: Element | null = el;
    const scrollable = [];
    while ((node = node.parentElement)) {
        if (!isScrollable(node)) continue;
        scrollable.push(node);
    }
    return scrollable;
}

export function getViewportRect(el: Element) {
    return el === document.documentElement
        ? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
        : el.getBoundingClientRect();
}
