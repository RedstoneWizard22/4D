declare namespace svelte.JSX {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLAttributes<T> {
    /** See draggable action */
    ondragmove?: (ev: CustomEvent<{ x: number; y: number; dx: number; dy: number }>) => void;
    /** See draggable action */
    ondragend?: (ev: CustomEvent<{ x: number; y: number }>) => void;
    /** See draggable action */
    ondragstart?: (ev: CustomEvent<{ x: number; y: number }>) => void;
  }
}
