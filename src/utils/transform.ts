// Transform functions from https://github.com/clauderic/dnd-kit
// Copyright (c) 2021, Claudéric Demers (MIT License)

export type Transform = {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
};

export function getClientRectWithoutTransform(element: Element) {
    let rect = element.getBoundingClientRect();

    const { transform, transformOrigin } = window.getComputedStyle(element);
    if (transform) {
        rect = inverseTransform(rect, transform, transformOrigin);
    }

    return rect;
}

export function inverseTransform(
    rect: DOMRect,
    transform: string,
    transformOrigin: string
): DOMRect {
    const parsedTransform = parseTransform(transform);

    if (!parsedTransform) {
        return rect;
    }

    const { scaleX, scaleY, x: translateX, y: translateY } = parsedTransform;

    const x =
        rect.left - translateX - (1 - scaleX) * parseFloat(transformOrigin);
    const y =
        rect.top -
        translateY -
        (1 - scaleY) *
            parseFloat(transformOrigin.slice(transformOrigin.indexOf(' ') + 1));
    const w = scaleX ? rect.width / scaleX : rect.width;
    const h = scaleY ? rect.height / scaleY : rect.height;

    return new DOMRect(x, y, w, h);
}

export function parseTransform(transform: string): Transform | null {
    if (transform.startsWith('matrix3d(')) {
        const transformArray = transform.slice(9, -1).split(/, /);

        return {
            x: +transformArray[12],
            y: +transformArray[13],
            scaleX: +transformArray[0],
            scaleY: +transformArray[5],
        };
    } else if (transform.startsWith('matrix(')) {
        const transformArray = transform.slice(7, -1).split(/, /);

        return {
            x: +transformArray[4],
            y: +transformArray[5],
            scaleX: +transformArray[0],
            scaleY: +transformArray[3],
        };
    }

    return null;
}
