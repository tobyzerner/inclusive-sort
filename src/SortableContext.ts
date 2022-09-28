import { Sensor } from './sensors';
import { Sortable, SortableDragEvent } from './Sortable';
import { centerOfRectangle } from './utils/geometry';
import { Listeners } from './utils/listeners';
import { getClientRectWithoutTransform } from './utils/transform';

export class SortableContext {
    public overItem?: HTMLElement;
    public overlay: HTMLElement;
    public pointer: DOMPoint = new DOMPoint(0, 0);
    public pointerOffset: DOMPoint = new DOMPoint(0, 0);
    public position: DOMRect;
    public itemsByContainer: Map<HTMLElement, Set<HTMLElement>>;
    public rects: Map<HTMLElement, DOMRect> = new Map();
    public originalContainer?: HTMLElement;
    public originalIndex: number = -1;

    private documentListeners = new Listeners(document);
    private windowListeners = new Listeners(window);

    constructor(
        private instance: Sortable,
        private sensor: Sensor,
        public activeItem: HTMLElement,
        public activator: HTMLElement,
        private onFinished: () => void,
        pointer?: DOMPoint
    ) {
        this.itemsByContainer = new Map();

        for (let container of instance.containers) {
            const items = (
                Array.from(container.children) as HTMLElement[]
            ).filter(this.instance.options.filter);

            const activeIndex = items.indexOf(activeItem);
            if (activeIndex !== -1) {
                this.originalContainer = container;
                this.originalIndex = activeIndex;
            }
            this.itemsByContainer.set(container, new Set(items));
        }

        this.updateRects();

        this.position = DOMRect.fromRect(this.rects.get(this.activeItem)!);
        this.pointer = pointer || centerOfRectangle(this.position);
        this.pointerOffset = new DOMPoint(
            this.position.x - this.pointer.x,
            this.position.y - this.pointer.y
        );

        this.overlay = this.createOverlay(activeItem);
        this.updateOverlay();
        document.body.appendChild(this.overlay);

        this.windowListeners.add('scroll', this.onScroll, {
            capture: true,
            passive: true,
        });

        this.documentListeners.add('keydown', this.onKeyDown);

        this.instance.announce(
            this.instance.options.announcements.onDragStart(this)
        );
    }

    public get options() {
        return this.instance.options;
    }

    public get container() {
        for (let [container, items] of this.itemsByContainer) {
            if (items.has(this.activeItem)) return container;
        }
        return Array.from(this.itemsByContainer.keys())[0];
    }

    public get activeIndex() {
        for (let [, items] of this.itemsByContainer) {
            if (!items.has(this.activeItem)) continue;
            return Array.from(items).indexOf(this.activeItem);
        }
        return -1;
    }

    public get overIndex() {
        if (this.overItem) {
            for (let [, items] of this.itemsByContainer) {
                if (!items.has(this.overItem)) continue;
                return Array.from(items).indexOf(this.overItem);
            }
        }
        return -1;
    }

    public onMove = (pointer: DOMPoint, immediate?: boolean) => {
        this.pointer = pointer;
        this.position.x = pointer.x + this.pointerOffset.x;
        this.position.y = pointer.y + this.pointerOffset.y;

        const event = new CustomEvent('dragmove', {
            detail: this,
        }) as SortableDragEvent;

        this.instance.dispatchEvent(event);

        this.updateOverlay(immediate);

        let rects = new Map();

        // If the pointer is over a container, only take that container's
        // items into consideration (or if it's empty, the container itself.
        this.itemsByContainer.forEach((items, container) => {
            const rect = this.rects.get(container)!;
            if (
                pointer.x > rect.left &&
                pointer.x < rect.right &&
                pointer.y > rect.top &&
                pointer.y < rect.bottom
            ) {
                if (items.size) {
                    items.forEach((item) =>
                        rects.set(item, this.rects.get(item))
                    );
                } else {
                    rects.set(container, this.rects.get(container));
                }
            }
        });

        if (!rects.size) {
            rects = this.rects;
        }

        const overItem = this.options.collisionDetection(this.position, rects);

        if (overItem !== this.overItem) {
            const event = new CustomEvent('dragover', {
                cancelable: true,
                detail: { ...this, overItem },
            }) as SortableDragEvent;

            this.instance.dispatchEvent(event);

            if (event.defaultPrevented) return;

            this.overItem = overItem;
        }

        // Move to another container
        this.itemsByContainer.forEach((items, container) => {
            if (items.has(this.activeItem) && !container.contains(overItem)) {
                items.delete(this.activeItem);
            } else if (
                container.contains(overItem) &&
                !items.has(this.activeItem)
            ) {
                items.add(this.activeItem);
                container.appendChild(this.activeItem);
                this.updateRects();
            }
        });

        this.instance.announce(
            this.instance.options.announcements.onDragOver(this)
        );

        this.itemsByContainer.forEach((items) => {
            const itemsArray = Array.from(items);
            const activeIndex = itemsArray.indexOf(this.activeItem);
            const overIndex = itemsArray.indexOf(overItem);
            const rects = itemsArray.map((item) => this.rects.get(item)!);

            itemsArray.forEach((item, index) => {
                item.style.transform = 'none';
                if (overIndex === -1) return;
                const result = this.options.strategy({
                    rects,
                    activeIndex,
                    overIndex,
                    index,
                });
                if (!result) return;
                const x = Math.round(result.x);
                const y = Math.round(result.y);
                item.style.transform = `translate(${x}px, ${y}px)`;
            });
        });
    };

    public onDrop = () => {
        const { activeItem, overItem } = this;

        if (activeItem && overItem) {
            const event = new CustomEvent('drop', {
                cancelable: true,
                detail: this,
            }) as SortableDragEvent;

            this.instance.dispatchEvent(event);

            if (!event.defaultPrevented) {
                if (this.instance.containers.has(overItem)) {
                    overItem.appendChild(activeItem);
                } else if (
                    activeItem.compareDocumentPosition(overItem) ===
                    Node.DOCUMENT_POSITION_PRECEDING
                ) {
                    overItem.before(activeItem);
                } else {
                    overItem.after(activeItem);
                }

                this.instance.announce(
                    this.instance.options.announcements.onDrop(this)
                );
            }
        }

        this.destroy();
    };

    public onCancel = () => {
        if (
            this.activeItem &&
            this.originalContainer &&
            this.originalIndex !== -1
        ) {
            this.originalContainer.insertBefore(
                this.activeItem,
                this.originalContainer.children[this.originalIndex]
            );
        }

        const event = new CustomEvent('dragcancel', {
            cancelable: false,
            detail: this,
        }) as SortableDragEvent;

        this.instance.dispatchEvent(event);

        this.instance.announce(
            this.instance.options.announcements.onDragCancel(this)
        );

        this.activator.focus();

        // Wait for the scroll position to update after re-focusing the activator.
        setTimeout(() => this.destroy());
    };

    private destroy() {
        this.sensor.deactivate();

        this.itemsByContainer.forEach((items) => {
            items.forEach((item) => {
                item.style.transition = 'none';
                item.style.transform = 'none';
                void item.offsetWidth;
                item.style.transition = '';
            });
        });

        const { activeItem, overlay } = this;

        if (activeItem && overlay) {
            const rect = activeItem.getBoundingClientRect();
            overlay.style.transform = `translate(${rect.x}px, ${rect.y}px)`;

            Promise.all(
                overlay.getAnimations().map((animation) => animation.finished)
            ).then(() => {
                overlay.remove();

                const event = new CustomEvent('dragend', {
                    cancelable: false,
                    detail: this,
                }) as SortableDragEvent;

                this.instance.dispatchEvent(event);
            });
        }

        this.windowListeners.removeAll();
        this.documentListeners.removeAll();

        this.onFinished();
    }

    private updateRects() {
        this.rects.clear();
        this.itemsByContainer.forEach((items, container) => {
            [container, ...items].forEach((el) => {
                this.rects.set(el, getClientRectWithoutTransform(el));
            });
        });
    }

    private createOverlay(item: HTMLElement) {
        const overlay = item.cloneNode(true) as HTMLElement;
        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0,
            left: 0,
            margin: 0,
        });
        return overlay;
    }

    private updateOverlay(immediate?: boolean) {
        Object.assign(this.overlay.style, {
            transform: `translate(${this.position.x}px, ${this.position.y}px)`,
            width: this.position.width + 'px',
            height: this.position.height + 'px',
        });

        if (immediate) {
            const transition = this.overlay.style.transition;
            this.overlay.style.transition = 'none';
            void this.overlay.offsetWidth;
            this.overlay.style.transition = transition;
        }
    }

    private onScroll = () => {
        this.updateRects();
        this.onMove(this.pointer);
    };

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.onCancel();
        }
    };
}
