type AnimationDebuggerOptions = {
  mode?: 'frames' | 'duration';
  frames?: number;
  duration?: number;
};

type AnimationDebugger = {
  begin: () => void;
  endSection: (name: string) => void;
  setOptions: (opts: AnimationDebuggerOptions) => void;
};

function useAnimationDebugger(opts: AnimationDebuggerOptions = {}) {
  let mode = opts.mode ?? 'frames';
  let frames = opts.frames ?? 100;
  let duration = opts.duration ?? 1000;

  let times: Record<string, number> = {};
  let frameCount = 0;
  let time = 0;

  let start = 0;
  const begin = () => {
    frameCount++;
    if (mode === 'frames' && frameCount == frames) {
      console.log(`${frameCount} frames in ${time}ms`);
      Object.entries(times).forEach(([name, time]) => {
        console.log(`> ${time}ms ${name}`);
      });
      times = {};
      frameCount = 0;
      time = 0;
    } else if (mode === 'duration' && time >= duration) {
      console.log(`${frameCount} frames in ${time}ms`);
      Object.entries(times).forEach(([name, time]) => {
        console.log(`> ${time}ms ${name}`);
      });
      times = {};
      frameCount = 0;
      time = 0;
    }
    start = performance.now();
  };

  const endSection = (name: string) => {
    const end = performance.now();
    times[name] = (times[name] ?? 0) + end - start;
    time += end - start;
    start = end;
  };

  const setOptions = (opts: AnimationDebuggerOptions) => {
    mode = opts.mode ?? mode;
    frames = opts.frames ?? frames;
    duration = opts.duration ?? duration;
  };

  return { begin, endSection, setOptions };
}

export { useAnimationDebugger, type AnimationDebugger };
