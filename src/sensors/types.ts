import { SortableContext } from '../SortableContext';

export interface Sensor {
    attach(
        activator: HTMLElement,
        onStart: (pointer?: DOMPoint) => SortableContext | undefined
    ): Detacher;

    deactivate(): void;

    destroy(): void;
}

export type Detacher = () => void;
