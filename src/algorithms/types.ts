export type CollisionDetection = (
    collisionRect: DOMRect,
    rects: Map<HTMLElement, DOMRect>
) => HTMLElement;
