# JSON structure for wireframe3d data

## Elements

### vertices

List of coordinates of the vertices, these should all be normalised so that the shape fits within a unit sphere

```
"vertices":[
    [Float, Float, Float],
    [Float, Float, Float],
    [Float, Float, Float],
    [Float, Float, Float],
    ...
],
```

### faces

List of vertex sets that enclose each face. The vertices are listed in traversal order, so any adjacent pair of vertices is an edge of the face. Faces can have any number of vertices > 3,
faces of different size for the same object are allowed.

```
"faces":[
  [Int, Int, Int, Int, ...],
  [Int, Int, Int, Int, ...],
  [Int, Int, Int, Int, ...],
  [Int, Int, Int, Int, ...],
  ...
],
```
