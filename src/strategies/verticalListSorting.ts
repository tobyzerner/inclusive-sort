import { Strategy } from './types';

/**
 * Sorting strategy for items laid out in a vertical list.
 */
export const verticalListSorting: Strategy = ({
    rects,
    index,
    overIndex,
    activeIndex,
}) => {
    const activeRect = rects[activeIndex];

    if (index === activeIndex) {
        const overRect = rects[overIndex];

        return {
            x: 0,
            y:
                activeIndex < overIndex
                    ? overRect.top +
                      overRect.height -
                      (activeRect.top + activeRect.height)
                    : overRect.top - activeRect.top,
        };
    }

    const itemGap = getItemGap(rects, index, activeIndex);

    if (index > activeIndex && index <= overIndex) {
        return {
            x: 0,
            y: -activeRect.height - itemGap,
        };
    }

    if (index < activeIndex && index >= overIndex) {
        return {
            x: 0,
            y: activeRect.height + itemGap,
        };
    }

    return {
        x: 0,
        y: 0,
    };
};

function getItemGap(
    clientRects: DOMRect[],
    index: number,
    activeIndex: number
) {
    const currentRect = clientRects[index];
    const previousRect = clientRects[index - 1];
    const nextRect = clientRects[index + 1];

    if (!currentRect) {
        return 0;
    }

    if (activeIndex < index) {
        return previousRect
            ? currentRect.top - (previousRect.top + previousRect.height)
            : nextRect
            ? nextRect.top - (currentRect.top + currentRect.height)
            : 0;
    }

    return nextRect
        ? nextRect.top - (currentRect.top + currentRect.height)
        : previousRect
        ? currentRect.top - (previousRect.top + previousRect.height)
        : 0;
}
