export function getAccessibleLabel(el: Element) {
    const id = el.getAttribute('aria-labelledby');
    return (
        (id && document.getElementById(id)?.textContent) ||
        el.getAttribute('aria-label')
    );
}
