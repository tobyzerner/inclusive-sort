import { SortableContext } from '../SortableContext';
import { Listeners } from '../utils/listeners';
import { getViewportRect, isScrollable } from '../utils/scroll';
import { Sensor } from './types';

const scrollThreshold = 0.2;
const scrollSpeed = 20; // pixels per frame

export class PointerSensor implements Sensor {
    private scrollInterval?: number;
    private scrollAmounts: Map<Element, [number, number]> = new Map();

    documentListeners = new Listeners(document);

    public attach(
        node: HTMLElement,
        onStart: (pointer?: DOMPoint) => SortableContext | undefined
    ) {
        const handler = (e: PointerEvent) => {
            if (e.button !== 0) return;

            const context = onStart(new DOMPoint(e.clientX, e.clientY));
            if (!context) return;

            e.preventDefault();

            this.documentListeners.add(
                'pointermove',
                this.onPointerMove.bind(this, context)
            );

            this.documentListeners.add(
                'pointerup',
                this.onPointerUp.bind(this, context)
            );
        };

        node.addEventListener('pointerdown', handler);
        node.style.touchAction = 'none';

        return () => {
            node.removeEventListener('pointerdown', handler);
            node.style.touchAction = '';
        };
    }

    public deactivate() {
        this.clearScrollInterval();
        this.documentListeners.removeAll();
    }

    public destroy() {}

    private onPointerMove = (context: SortableContext, e: MouseEvent): void => {
        e.preventDefault();

        context.onMove(new DOMPoint(e.clientX, e.clientY), true);

        this.scrollAmounts.clear();

        document.elementsFromPoint(e.clientX, e.clientY).forEach((el) => {
            if (!isScrollable(el)) return;

            const rect = getViewportRect(el),
                w = scrollThreshold * rect.width,
                h = scrollThreshold * rect.height;

            let x = 0,
                y = 0;

            if (e.clientX > rect.right - w) {
                x = ((e.clientX - rect.right + w) / w) * scrollSpeed;
            } else if (e.clientX < rect.left + w) {
                x = ((e.clientX - w) / w) * scrollSpeed;
            }

            if (e.clientY > rect.bottom - h) {
                y = ((e.clientY - rect.bottom + h) / h) * scrollSpeed;
            } else if (e.clientY < rect.top + h) {
                y = ((e.clientY - h) / h) * scrollSpeed;
            }

            if (x !== 0 || y !== 0) {
                this.scrollAmounts.set(el, [x, y]);
            }
        });

        if (this.scrollAmounts.size) {
            this.scrollInterval ||= window.setInterval(() => {
                this.scrollAmounts.forEach(([x, y], el) => el.scrollBy(x, y));
            }, 1000 / 60);
        } else {
            this.clearScrollInterval();
        }
    };

    private onPointerUp = (context: SortableContext, e: PointerEvent): void => {
        e.preventDefault();
        context.onDrop();
    };

    private clearScrollInterval() {
        clearInterval(this.scrollInterval);
        this.scrollInterval = undefined;
    }
}
