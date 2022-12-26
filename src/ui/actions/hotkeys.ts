// Code below is based on:
// https://github.com/mantinedev/mantine/blob/master/src/mantine-hooks/src/use-hotkeys/parse-hotkey.ts

export type HotkeyDef = [string, (event: KeyboardEvent) => void, { preventDefault?: boolean }?];

/**
 * Action which listens for key combinations on the attached node, executing callbacks in response.
 *
 * - `ctrl+shift+X` – attatch modifiers with +; supported modifiers are: alt, ctrl, meta, shift, mod
 * - `ArrowLeft,ArrowRight` – use commas to specify multiple keybinds
 * - `mod+S` – detects ⌘+S on macOS and Ctrl+S on Windows and Linux
 * - `alt + shift + L` – whitespace is allowed
 *
 * @example
 * ```svelte
 * <button
 *   use:hotkeys={[
 *     ['ArrowUp,ArrowRight', () => increment()],
 *     ['ArrowDown,ArrowLeft', () => decrement()],
 *     ['ctrl+shift+r', () => reset()],
 *     ['ctrl+a', () => alert('ctrl+a'), { preventDefault: false }],
 *   ]}
 * />
 * ```
 */
export function hotkeys(node: HTMLElement, options: HotkeyDef[]): SvelteActionReturnType {
  let handler = getHotkeyHandler(options);

  node.addEventListener('keydown', handler);

  return {
    destroy() {
      node.removeEventListener('keydown', handler);
    },
    update(options?: HotkeyDef[]) {
      if (Array.isArray(options)) {
        node.removeEventListener('keydown', handler);
        handler = getHotkeyHandler(options);
        node.addEventListener('keydown', handler);
      }
    },
  };
}

type KeyboardModifiers = {
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
  mod: boolean;
  shift: boolean;
};

type Hotkey = KeyboardModifiers & {
  key?: string;
};

function parseHotkey(hotkey: string): Hotkey {
  const keys = hotkey
    .toLowerCase()
    .split('+')
    .map((part) => part.trim());

  const modifiers: KeyboardModifiers = {
    alt: keys.includes('alt'),
    ctrl: keys.includes('ctrl'),
    meta: keys.includes('meta'),
    mod: keys.includes('mod'),
    shift: keys.includes('shift'),
  };

  const reservedKeys = ['alt', 'ctrl', 'meta', 'shift', 'mod'];

  const freeKey = keys.find((key) => !reservedKeys.includes(key));

  return {
    ...modifiers,
    key: freeKey,
  };
}

function isExactHotkey(hotkey: Hotkey, event: KeyboardEvent): boolean {
  const { alt, ctrl, meta, mod, shift, key } = hotkey;
  const { altKey, ctrlKey, metaKey, shiftKey, key: pressedKey } = event;

  if (alt !== altKey) {
    return false;
  }
  if (mod) {
    if (!ctrlKey && !metaKey) {
      return false;
    }
  } else {
    if (ctrl !== ctrlKey) {
      return false;
    }
    if (meta !== metaKey) {
      return false;
    }
  }
  if (shift !== shiftKey) {
    return false;
  }

  if (
    key &&
    (pressedKey.toLowerCase() === key.toLowerCase() ||
      event.code.replace('Key', '').toLowerCase() === key.toLowerCase())
  ) {
    return true;
  }

  return false;
}

export function getHotkeyMatcher(hotkey: string) {
  const hotkeys = hotkey.split(',').map((s) => s.trim());

  return (event: KeyboardEvent) =>
    hotkeys.some((hotkey) => isExactHotkey(parseHotkey(hotkey), event));
}

export function getHotkeyHandler(hotkeys: HotkeyDef[]) {
  return (event: KeyboardEvent) => {
    hotkeys.forEach(([hotkey, handler, options]) => {
      if (getHotkeyMatcher(hotkey)(event)) {
        if (options?.preventDefault ?? true) {
          event.preventDefault();
        }
        handler(event);
      }
    });
  };
}
