import { SortableContext } from '../SortableContext';
import { Attributes } from '../utils/attributes';
import { centerOfRectangle } from '../utils/geometry';
import { Listeners } from '../utils/listeners';
import { getScrollableAncestors, getViewportRect } from '../utils/scroll';
import { Sensor } from './types';

export interface KeyboardSensorOptions {
    /**
     * Screen reader instructions to be spoken when an activator node is focused.
     */
    instructions?: string;
}

const defaultOptions: KeyboardSensorOptions = {
    instructions:
        'To pick up a sortable item, press space or enter. ' +
        'While dragging, use the arrow keys to move the item. ' +
        'Press space or enter again to drop the item in its new position, or press escape to cancel.',
};

let i = 0;

export class KeyboardSensor implements Sensor {
    private options: KeyboardSensorOptions;
    private instructionsElement?: HTMLElement;
    private documentListeners = new Listeners(document);

    constructor(options: KeyboardSensorOptions = {}) {
        this.options = Object.assign({}, defaultOptions, options);
        this.instructionsElement = this.createInstructionsElement();
    }

    public attach(
        node: HTMLElement,
        onStart: (pointer?: DOMPoint) => SortableContext | undefined
    ) {
        const handler = (e: KeyboardEvent) => {
            if (!['Enter', 'Space'].includes(e.code)) return;

            const context = onStart();
            if (!context) return;

            e.preventDefault();

            // Bind the keydown event after a short delay so that we don't end
            // up immediately dropping the item from the current key press.
            setTimeout(() =>
                this.documentListeners.add(
                    'keydown',
                    this.onKeyDown.bind(this, context)
                )
            );
        };

        const attributes = new Attributes(node);

        attributes.add('tabindex', '0');
        attributes.add('role', 'button');
        attributes.add('aria-roledescription', 'sortable');

        if (this.instructionsElement) {
            attributes.add('aria-describedby', this.instructionsElement.id);
        }

        node.addEventListener('keydown', handler);

        return () => {
            attributes.revertAll();
            node.removeEventListener('keydown', handler);
        };
    }

    deactivate(): void {
        this.documentListeners.removeAll();
    }

    destroy(): void {
        this.instructionsElement?.remove();
    }

    private onKeyDown(context: SortableContext, e: KeyboardEvent) {
        if (['Enter', 'Space'].includes(e.code)) {
            e.preventDefault();
            context.onDrop();
            context.activator.focus();
            return;
        }

        if (
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)
        ) {
            e.preventDefault();

            const {
                options: { collisionDetection, strategy },
                rects,
                itemsByContainer,
                pointer,
                position,
                activeItem,
                onMove,
                container,
            } = context;

            // Begin by working out which rectangles exist in the direction that
            // we want to move. They must have their edge on the advancing side
            // of the pointer.
            const possibleRects = new Map();

            for (let [container, items] of itemsByContainer) {
                for (let el of items.size ? items : [container]) {
                    const rect = rects.get(el)!;
                    if (
                        (e.key === 'ArrowUp' && rect.bottom < pointer.y) ||
                        (e.key === 'ArrowDown' && rect.top > pointer.y) ||
                        (e.key === 'ArrowLeft' && rect.right < pointer.x) ||
                        (e.key === 'ArrowRight' && rect.left > pointer.x)
                    ) {
                        possibleRects.set(el, rect);
                    }
                }
            }

            // Perform collision detection on the filtered rects to work out
            // where the next closest item is that we will be moving to, then
            // move there.
            const overItem = collisionDetection(position, possibleRects);
            if (!overItem) return;

            onMove(centerOfRectangle(rects.get(overItem)!));

            // We moved to the new position, but we're not done yet! With some
            // sorting strategies, the position of the item will have changed
            // since we moved. So, we will need to find out the new position
            // and perform another little move.
            let point = centerOfRectangle(rects.get(activeItem)!);

            for (let [, items] of itemsByContainer) {
                if (!items.has(activeItem)) continue;

                const itemsArray = Array.from(items);
                const activeIndex = itemsArray.indexOf(activeItem);
                let overIndex = itemsArray.indexOf(overItem);

                // If we just changed containers and we're moving up or left,
                // the item will have been appended to the container, so we
                // will have moved over the second-to-last item. Let's manually
                // correct that here.
                if (e.key === 'ArrowUp' && container !== context.container) {
                    overIndex++;
                }

                const result = strategy({
                    rects: itemsArray.map((item) => rects.get(item)!),
                    activeIndex: activeIndex,
                    overIndex: overIndex === -1 ? activeIndex : overIndex,
                    index: activeIndex,
                });

                point.x += result?.x || 0;
                point.y += result?.y || 0;
            }

            // We've worked out the corrected point we want to move to. Finally,
            // we need to consider auto-scrolling. We want to scroll the active
            // item's scrollable ancestors so that it is as close to the center
            // as possible. We keep track of the amount we've scrolled and
            // subtract that from the item's new position before moving it again.
            let deltaX = 0,
                deltaY = 0;

            for (let el of getScrollableAncestors(activeItem)) {
                const rect = getViewportRect(el);

                const localDeltaX = Math.min(
                    el.scrollWidth - el.clientWidth - el.scrollLeft,
                    Math.max(-el.scrollLeft, point.x - rect.x - rect.width / 2)
                );

                const localDeltaY = Math.min(
                    el.scrollHeight - el.clientHeight - el.scrollTop,
                    Math.max(-el.scrollTop, point.y - rect.y - rect.height / 2)
                );

                el.scrollBy({
                    left: localDeltaX,
                    top: localDeltaY,
                    behavior: 'smooth',
                });

                deltaX += localDeltaX;
                deltaY += localDeltaY;
            }

            onMove(new DOMPoint(point.x - deltaX, point.y - deltaY));
        }
    }

    private createInstructionsElement() {
        if (!this.options.instructions) return;
        const el = document.createElement('div');
        el.id = 'SortableInstructions-' + i++;
        el.style.display = 'none';
        el.textContent = this.options.instructions;
        document.body.appendChild(el);
        return el;
    }
}
