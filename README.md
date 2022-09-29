# Inclusive Sort

**Drag and drop sorting that just works – for everyone.**

There's no better example of accessiblity being an afterthought than drag and drop interfaces. Some of the most popular options today are [totally](https://github.com/SortableJS/Sortable/issues/1176) [inaccessible](https://github.com/bevacqua/dragula/issues/538) to many people. We need to do better.

Inclusive Sort takes inspiration from the wonderful [dnd kit](https://dndkit.com), but is focused on sortable lists and doesn't require React. Features include:

-   **🦮 Accessible.** Keyboard support, sensible default ARIA attributes, and customizable screen reader instructions and announcements built in.
-   **🌳 Lightweight.** 5.5kB gzipped with no dependencies.
-   **🦾 Versatile.** Supports sorting of lists and grids across multiple containers with variable sized items.
-   **⌨️ Multiple input methods.** Pointer and keyboard sensors included, with an API to support more.
-   **↕️ Auto-scroll.** Drag near the edge of a scroll container to start scrolling.
-   **🎨 Customizable.** Fully customize animations, styles, behaviors, input methods, and collision detection.

[**Demo**](https://tobyzerner.github.io/inclusive-sort/index.html)

## Installation

```
npm install inclusive-sort --save
```

## Usage

<!-- TOC -->
* [Containers](#containers)
* [Filtering Items](#filtering-items)
* [Activators](#activators)
* [Sorting Strategies](#sorting-strategies)
* [Sensors](#sensors)
  * [Pointer](#pointer)
  * [Keyboard](#keyboard)
  * [Cancellation](#cancellation)
* [Collision Detection](#collision-detection)
* [Events](#events)
* [Announcements](#announcements)
<!-- TOC -->

### Containers

To get started, create a new `Sortable` instance, and add one or more **containers**. The children of these containers will become sortable, and can be moved between containers.

```ts
import { Sortable } from 'inclusive-sort';

const sortable = new Sortable({
    containers: document.querySelectorAll('ul'),
});
```

You can also add and remove containers later on using the `addContainer` and `removeContainer` methods:

```ts
sortable.addContainer(el);
sortable.removeContainer(el);
```

Container children are automatically tracked, attaching and detaching [sensors](#sensors) whenever children are added and removed.

### Animations

Items are moved around by setting the `transform` CSS property, so if you want buttery smooth animations, simply add a CSS transition to your sortable items:

```css
@media (prefers-reduced-motion: no-preference) {
  li {
    transition: transform 0.3s;
  }
}
```

Note that the **overlay** element (a clone of the active item that follows the pointer) is appended to the document body, so it will not inherit styles from the container.

### Filtering Items

By default, all children of a container will be sortable. You can filter which children are sortable using the `filter` option, which receives the child element and must return a boolean:

```html
<li>Static item</li>
<li data-sortable>Sortable item</li>
```

```ts
new Sortable({
    filter: (el) => el.hasAttribute('data-sortable'),
});
```

### Activators

An item's **activator** is the handle which you can grab (or activate with the keyboard) to start moving the item. By default, the whole item itself is used as the activator.

If you'd like to use a specific drag handle, you can set the `activator` option, which receives the item element and should return the element to use as the activator:

```html
<li>
  <button>Drag handle</button>
</li>
```

```ts
new Sortable({
    activator: (el) => el.querySelector('button'),
});
```

### Sorting Strategies

You should use a **sorting strategy** optimized for your use-case. Using the correct strategy ensures that items are laid out correctly while sorting is taking place.

- `rectSorting`: This is the default strategy, suitable for most use cases.
- `verticalListSorting`: This strategy is optimized for vertical lists, where items have variable heights.
- `horizontalListSorting`: This strategy is optimized for horizontal lists, where items have variable widths.

```ts
import { Sortable, verticalListSorting } from 'inclusive-sort';

new Sortable({
    strategy: verticalListSorting,
});
```

### Sensors

**Sensors** attach attributes and listeners to sortable items in order to allow initiating and controlling sorting operations by multiple input methods.

By default, the Pointer and Keyboard sensors are used. If you'd like to customize these, specify the `sensors` option:

```ts
import { Sortable, KeyboardSensor } from 'inclusive-sort';

new Sortable({
    sensors: [new KeyboardSensor()],
});
```

#### Pointer

The `PointerSensor` responds to [Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events). It listens for the `pointerdown` event on activator elements to begin a sorting operation.

It also sets [`touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) to `none` on activator elements to prevent scrolling. If your draggable item is part of a scrollable list, you should use a [drag handle](#activators) so that the contents of the list can still be scrolled.

The Pointer sensor will detect if the pointer is close to the edge of any scrollable containers (including the viewport) and start scrolling them if so.

#### Keyboard

The `KeyboardSensor` responds to [Keyboard events](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent). When one of the `Enter` or `Space` keys are pressed on the activator element, a sorting operation will begin. The `Arrow` keys can be used to move the item. Pressing the `Enter` or `Space` key again will drop the item in its new position.

The Keyboard sensor will scroll the active item's scrollable ancestors so that it remains as close to the center as possible.

The following accessibility attributes are set on the activator element (if they are not already set):

- `tabindex="0"` to ensure the activator element can be focused
- `role="button"`
- `aria-roledescription="sortable"`
- `aria-describedby` to the ID of an element containing screen reader instructions

The default screen reader instructions used are:

> To pick up a sortable item, press space or enter.  
> While dragging, use the arrow keys to move the item.  
> Press space or enter again to drop the item in its new position, or press escape to cancel.

You can customize the screen reader instructions by passing in the `instructions` option when instantiating the `KeyboardSensor`:

```ts
import { Sortable, KeyboardSensor } from 'inclusive-sort';

new Sortable({
    sensors: [
        new KeyboardSensor({ instructions: 'My custom instructions' })
    ],
});
```

#### Cancellation

The `Escape` key will cancel a sort operation, regardless of what sensor is active.

### Collision Detection

You can customize the algorithm used to detect which position the item is being dragged over. By default, the `closestCenter` algorithm is used, which finds the position with the shortest line between its center and that of the overlay. This works well for the vast majority of use cases, but you can specify another algorithm using the `collisionDetection` option:

```ts
new Sortable({
    collisionDetection: (collisionRect: DOMRect, rects: Map<HTMLElement, DOMRect>) => {
        // return the HTMLElement that provides the best collision
    },
});
```

Note that if the pointer is overlapping a specific container, the list of possible `rects` is limited to that container's items (or the container itself if it is empty). Otherwise, `rects` includes all items from all containers, as well as empty containers.

### Events

A `Sortable` instance is an `EventTarget` which you can add event listeners to. The events fired are:

| Event        | Description                                               | Cancellable |
|--------------|-----------------------------------------------------------|-------------|
| `dragstart`  | Fired when a drag operation is being initiated.           | Yes         |
| `dragmove`   | Fired when the pointer moves.                             | No          |
| `dragover`   | Fired when the item is dragged over another.              | Yes         |
| `dragcancel` | Fired when the drag operation is cancelled.               | No          |
| `drop`       | Fired when the item is dropped into its new position.     | Yes         |
| `dragend`    | Fired after the overlay has animated to its new position. | No          |

All events contain an instance of [`SortableContext`]() in their `detail` which allows inspecting many properties of the current drag operation. Cancellable events can be cancelled by calling `e.preventDefault()`.

A common example is to hide the active item while it is being dragged, and to style the overlay:

```ts
sortable.addEventListener('dragstart', (e) => {
    e.detail.activeItem.style.visibility = 'hidden';
    e.detail.overlay.style.background = '#fff';
})

sortable.addEventListener('dragend', (e) => {
    e.detail.activeItem.style.visibility = '';
})
```

### Announcements

A [live region](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions) is used to provide real-time updates to screen readers about the current drag operation. These instructions can be customized using the `announcements` option.

The default announcements use the `aria-label` or `aria-labelledby` attributes of items and containers to describe what is happening. If these are not set, they will fall back to positional descriptions.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
