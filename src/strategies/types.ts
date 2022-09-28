export type Strategy = (params: {
    rects: DOMRect[];
    activeIndex: number;
    overIndex: number;
    index: number;
}) => { x: number; y: number } | null;
