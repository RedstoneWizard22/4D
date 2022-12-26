export type DragstartEvent = CustomEvent<{ x: number; y: number }>;
export type DragmoveEvent = CustomEvent<{ x: number; y: number; dx: number; dy: number }>;
export type DragendEvent = CustomEvent<{ x: number; y: number }>;

/** Action which adds events for handling dragging of an element.  */
export function draggable(node: HTMLElement) {
  let x = 0,
    y = 0;

  /** Typeguard to distinguish between mouse and touch events */
  function isTouchEvent(ev: MouseEvent | TouchEvent): ev is TouchEvent {
    return ev.type.startsWith('touch');
  }

  function handleMousedown(event: TouchEvent | MouseEvent) {
    event.preventDefault();
    if (isTouchEvent(event)) {
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
    } else {
      x = event.clientX;
      y = event.clientY;
    }

    node.dispatchEvent(
      new CustomEvent('dragstart', {
        detail: { x, y },
      })
    );

    window.addEventListener('mousemove', handleMousemove, { passive: false });
    window.addEventListener('mouseup', handleMouseup);
    window.addEventListener('touchmove', handleMousemove, { passive: false });
    window.addEventListener('touchend', handleMouseup);
  }

  function handleMousemove(event: TouchEvent | MouseEvent) {
    event.preventDefault();

    let ev: Touch | MouseEvent;
    if (isTouchEvent(event)) {
      ev = event.changedTouches[0];
    } else {
      ev = event;
    }

    const dx = ev.clientX - x;
    const dy = ev.clientY - y;
    x = ev.clientX;
    y = ev.clientY;

    node.dispatchEvent(
      new CustomEvent('dragmove', {
        detail: { x, y, dx, dy },
      })
    );
  }

  function handleMouseup(event: TouchEvent | MouseEvent) {
    if (!isTouchEvent(event)) {
      x = event.clientX;
      y = event.clientY;
    }

    node.dispatchEvent(
      new CustomEvent('dragend', {
        detail: { x, y },
      })
    );

    window.removeEventListener('mousemove', handleMousemove);
    window.removeEventListener('mouseup', handleMouseup);
    window.removeEventListener('touchmove', handleMousemove);
    window.removeEventListener('touchend', handleMouseup);
  }

  node.addEventListener('mousedown', handleMousedown, { passive: false });
  node.addEventListener('touchstart', handleMousedown, { passive: false });

  return {
    destroy() {
      node.removeEventListener('mousedown', handleMousedown);
      node.removeEventListener('touchstart', handleMousedown);
    },
  };
}
