import { arrayMove } from '../utils/array';
import { Strategy } from './types';

/**
 * Sorting strategy for items laid out in a grid.
 */
export const rectSorting: Strategy = ({
    rects,
    index,
    overIndex,
    activeIndex,
}) => {
    const newRects = arrayMove(rects, overIndex, activeIndex);

    const oldRect = rects[index];
    const newRect = newRects[index];

    if (!newRect || !oldRect) {
        return null;
    }

    return {
        x: newRect.left - oldRect.left,
        y: newRect.top - oldRect.top,
    };
};
