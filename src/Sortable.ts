import { closestCenter, CollisionDetection } from './algorithms';
import { Detacher, KeyboardSensor, PointerSensor, Sensor } from './sensors';
import { SortableContext } from './SortableContext';
import { rectSorting, Strategy } from './strategies';
import { getAccessibleLabel } from './utils/accessibility';

export interface SortableOptions {
    /**
     * A list of containers to add to the sortable instance.
     */
    containers?: HTMLElement[] | NodeListOf<HTMLElement>;

    /**
     * Determine whether an item is sortable.
     */
    filter: (item: HTMLElement) => boolean;

    /**
     * Get the activator node for a sortable item. Defaults to the sortable
     * item itself.
     */
    activator: (item: HTMLElement) => HTMLElement | null;

    /**
     * A list of sensor instances to attach to sortable items. Defaults to
     * PointerSensor and KeyboardSensor.
     */
    sensors: Sensor[];

    /**
     * The collision detection algorithm to use. Defaults to closestCenter.
     */
    collisionDetection: CollisionDetection;

    /**
     * The sorting strategy to use. Defaults to rectSorting.
     */
    strategy: Strategy;

    /**
     * Screen reader announcements to be spoken on sorting events.
     */
    announcements: Announcements;
}

export interface Announcements {
    onDragStart(context: SortableContext): string;
    onDragOver(context: SortableContext): string;
    onDrop(context: SortableContext): string;
    onDragCancel(context: SortableContext): string;
}

const defaultOptions: SortableOptions = {
    filter: () => true,
    activator: (item: HTMLElement) => item,
    sensors: [new PointerSensor(), new KeyboardSensor()],
    collisionDetection: closestCenter,
    strategy: rectSorting,
    announcements: {
        onDragStart({ activeItem, activeIndex, container }) {
            const activeLabel =
                getAccessibleLabel(activeItem) || `item ${activeIndex + 1}`;
            const containerLabel = getAccessibleLabel(container);
            return (
                `Picked up ${activeLabel}` +
                (containerLabel ? ` in ${containerLabel}` : '')
            );
        },
        onDragOver({ activeItem, activeIndex, container, overIndex }) {
            const activeLabel =
                getAccessibleLabel(activeItem) || `item ${activeIndex + 1}`;
            const containerLabel = getAccessibleLabel(container);
            return (
                `${activeLabel} was moved to position ${overIndex + 1}` +
                (containerLabel ? ` in ${containerLabel}` : '')
            );
        },
        onDrop({ activeItem, activeIndex, container, overIndex }) {
            const activeLabel =
                getAccessibleLabel(activeItem) || `item ${activeIndex + 1}`;
            const containerLabel = getAccessibleLabel(container);
            return (
                `${activeLabel} was dropped in position ${overIndex + 1}` +
                (containerLabel ? ` in ${containerLabel}` : '')
            );
        },
        onDragCancel({ activeItem, activeIndex }) {
            const activeLabel =
                getAccessibleLabel(activeItem) || `item ${activeIndex + 1}`;
            return `Sorting was cancelled. ${activeLabel} was dropped.`;
        },
    },
};

export type SortableDragEvent = CustomEvent<SortableContext>;

interface SortableEventMap {
    dragstart: SortableDragEvent;
    dragmove: SortableDragEvent;
    dragover: SortableDragEvent;
    dragend: SortableDragEvent;
    dragcancel: SortableDragEvent;
    drop: SortableDragEvent;
}

interface SortableEventTarget extends EventTarget {
    addEventListener<K extends keyof SortableEventMap>(
        type: K,
        listener: (ev: SortableEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean
    ): void;
}

const TypedEventTarget = EventTarget as {
    new (): SortableEventTarget;
    prototype: SortableEventTarget;
};

export class Sortable extends TypedEventTarget {
    public readonly containers: Set<HTMLElement> = new Set();
    public readonly options: SortableOptions;

    private context?: SortableContext;
    private containerObservers: Map<HTMLElement, MutationObserver> = new Map();
    private itemDetachers: Map<HTMLElement, Detacher[]> = new Map();
    private liveRegion: HTMLElement;

    constructor(options: Partial<SortableOptions> = {}) {
        super();

        this.options = Object.assign({}, defaultOptions, options);

        this.liveRegion = this.createLiveRegion();

        options.containers?.forEach((container) =>
            this.addContainer(container)
        );
    }

    public announce(announcement: string) {
        this.liveRegion.textContent = announcement;
    }

    public destroy() {
        this.context?.onCancel();

        this.liveRegion.remove();

        this.containers.forEach((container) => this.removeContainer(container));

        this.options.sensors.forEach((sensor) => sensor.destroy());
    }

    public addContainer(container: HTMLElement): void {
        if (this.containers.has(container)) return;

        this.containers.add(container);

        // Attach all the container's items as they exist currently. We will
        // also set up a mutation observer to attach and detach items on the go.
        (Array.from(container.children) as HTMLElement[]).forEach((item) =>
            this.attachItem(item)
        );

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        // Attach the item in the next tick, to make sure this
                        // happens after it has been detached in a different
                        // mutation observer.
                        setTimeout(() => this.attachItem(node));
                    }
                });

                mutation.removedNodes.forEach((node) => {
                    if (node instanceof HTMLElement) {
                        this.detachItem(node);
                    }
                });
            });
        });

        observer.observe(container, { childList: true });

        this.containerObservers.set(container, observer);
    }

    public removeContainer(container: HTMLElement): void {
        if (!this.containers.has(container)) return;

        this.containers.delete(container);

        (Array.from(container.children) as HTMLElement[]).forEach((item) =>
            this.detachItem(item)
        );

        this.containerObservers.get(container)?.disconnect();
        this.containerObservers.delete(container);
    }

    private attachItem(item: HTMLElement) {
        if (!this.options.filter(item)) return;

        // Attach sensors to this new sortable item. Store the returned detacher
        // functions, so we can call them if the item is later removed.
        const detachers: Detacher[] = [];

        for (let sensor of this.options.sensors) {
            const activator = this.options.activator(item);
            if (!activator) continue;
            const detach = sensor.attach(activator, (pointer) =>
                this.start(sensor, item, activator, pointer)
            );
            detachers.push(detach);
        }

        this.itemDetachers.set(item, detachers);
    }

    private detachItem(item: HTMLElement) {
        this.itemDetachers.get(item)?.forEach((detach) => detach());
        this.itemDetachers.delete(item);
    }

    private start(
        sensor: Sensor,
        item: HTMLElement,
        activator: HTMLElement,
        pointer?: DOMPoint
    ): SortableContext | undefined {
        if (this.context) return;

        const context = new SortableContext(
            this,
            sensor,
            item,
            activator,
            () => (this.context = undefined),
            pointer
        );

        const event = new CustomEvent('dragstart', {
            cancelable: true,
            detail: context,
        }) as SortableDragEvent;

        this.dispatchEvent(event);

        if (event.defaultPrevented) return;

        return (this.context = context);
    }

    private createLiveRegion() {
        const el = document.createElement('div');
        Object.assign(el.style, {
            clip: 'rect(0 0 0 0)',
            clipPath: 'inset(50%)',
            height: '1px',
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            whiteSpace: 'nowrap',
            width: '1px',
        });
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'assertive');
        el.setAttribute('aria-atomic', '');
        document.body.appendChild(el);
        return el;
    }
}
