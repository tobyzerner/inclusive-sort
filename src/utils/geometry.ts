export function distanceBetweenPoints(a: DOMPoint, b: DOMPoint): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function centerOfRectangle(rect: DOMRect): DOMPoint {
    return new DOMPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
}
