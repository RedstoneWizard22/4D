function getEdgesFromFaces(faces: number[][]) {
  const edges: number[][] = [];
  const usedEdges = new Set<string>();
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const edge = [face[i], face[(i + 1) % face.length]].sort();
      const edgeStr = edge.join(',');
      if (!usedEdges.has(edgeStr)) {
        edges.push(edge);
        usedEdges.add(edgeStr);
      }
    }
  }
  return edges;
}

export { getEdgesFromFaces };
