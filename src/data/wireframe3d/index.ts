export const cube = {
  load: async () => (await import('./cube.json')).default,
};

export const dodecahedron = {
  load: async () => (await import('./dodecahedron.json')).default,
};

export const icosahedron = {
  load: async () => (await import('./icosahedron.json')).default,
};

export const octahedron = {
  load: async () => (await import('./octahedron.json')).default,
};

export const tetrahedron = {
  load: async () => (await import('./tetrahedron.json')).default,
};
