// BASED ON: https://stackoverflow.com/questions/19764018/controlling-fps-with-requestanimationframe

export type AnimationLoop = {
  add: (callback: (delta: number) => void) => void;
  remove: (callback: (delta: number) => void) => void;
  start: () => void;
  stop: () => void;
  setOptions: (opts: UseAnimationLoopOptions) => void;
};

type UseAnimationLoopOptions = {
  /** Maximum number of executions per second */
  maxFps?: number;
  /** True to automatically call `start` when the first callback is added, and `stop` when the last is removed */
  autoStart?: boolean;
};

export function useAnimationLoop({
  maxFps,
  autoStart,
}: UseAnimationLoopOptions = {}): AnimationLoop {
  maxFps = maxFps || Infinity;
  autoStart = autoStart || true;

  let animationFrame = 0,
    frameInterval = 1000 / maxFps,
    then = 0,
    running = false;

  const callbacks: Array<(delta: number) => void> = [];

  function animate(now: number) {
    running = true;

    // Request the next frame
    animationFrame = requestAnimationFrame(animate);

    // Calculate the time that passed since the last frame
    const delta = now - then;

    // If enough time has passed, draw the next frame
    if (delta > frameInterval) {
      // Get ready for the next frame by setting then = now, but also adjust for your
      // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
      then = frameInterval > 0 ? now - (delta % frameInterval) : now;

      // Call all the callbacks
      callbacks.forEach((callback) => callback(delta));
    }
  }

  function start() {
    stop();
    if (callbacks.length > 0) {
      animate(performance.now());
    } else {
      console.warn('Animation loop will not start because there are no registered callbacks');
    }
  }

  function stop() {
    cancelAnimationFrame(animationFrame);
    running = false;
  }

  function add(callback: (delta: number) => void) {
    callbacks.push(callback);
    if (autoStart && !running) {
      start();
    }
  }

  function remove(callback: (delta: number) => void) {
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
    if (callbacks.length === 0) {
      stop();
    }
  }

  function setOptions(opts: UseAnimationLoopOptions) {
    maxFps = opts.maxFps || maxFps;
    autoStart = opts.autoStart || autoStart;
    frameInterval = 1000 / (maxFps || Infinity);
  }

  return { add, remove, start, stop, setOptions };
}

// class AnimationLoop {
//   private callbacks: Array<(delta: number) => void> = [];
//   private animationFrameId = 0;
//   private then = 0;
//   private running = false;

//   maxFps = Infinity;
//   autoStart = true;

//   constructor(opts: UseAnimationLoopOptions = {}) {
//     this.maxFps = opts.maxFps ?? this.maxFps;
//     this.autoStart = opts.autoStart ?? this.autoStart;
//   }

//   private animate(now: number) {
//     this.running = true;

//     // Request the next frame
//     this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

//     // Calculate the delta time
//     const delta = now - this.then;

//     // If enough time has passed, draw the next frame
//     const frameInterval = 1000 / this.maxFps;
//     if (delta > frameInterval) {
//       // Get ready for the next frame by setting then = now, but also adjust for your
//       // specified fpsInterval not being a multiple of RAF's interval (16.7ms)
//       this.then = frameInterval > 0 ? now - (delta % frameInterval) : now;

//       // Call all the callbacks
//       this.callbacks.forEach((callback) => callback(delta));
//     }
//   }

//   start() {
//     this.stop();
//     if (this.callbacks.length > 0) {
//       this.animate(performance.now());
//     } else {
//       console.warn('Animation loop will not start because there are no registered callbacks');
//     }
//   }

//   stop() {
//     cancelAnimationFrame(this.animationFrameId);
//     this.running = false;
//   }

//   add(callback: (delta: number) => void) {
//     this.callbacks.push(callback);
//     if (this.autoStart && !this.running) {
//       this.start();
//     }
//   }

//   remove(callback: (delta: number) => void) {
//     const index = this.callbacks.indexOf(callback);
//     if (index > -1) {
//       this.callbacks.splice(index, 1);
//     }
//     if (this.callbacks.length === 0) {
//       stop();
//     }
//   }
// }
