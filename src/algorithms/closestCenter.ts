import { distanceBetweenPoints, centerOfRectangle } from '../utils/geometry';
import { CollisionDetection } from './types';

/**
 * Find the closest element by the distance to the center of its rect.
 */
export const closestCenter: CollisionDetection = (collisionRect, rects) => {
    const entries = Array.from(rects.entries());
    const point = centerOfRectangle(collisionRect);

    entries.sort(([, a], [, b]) => {
        return (
            distanceBetweenPoints(point, centerOfRectangle(a)) -
            distanceBetweenPoints(point, centerOfRectangle(b))
        );
    });

    return entries[0]?.[0];
};
