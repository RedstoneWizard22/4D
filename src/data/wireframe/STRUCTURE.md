# JSON structure for wireframe data

## Elements

### vertices

List of coordinates of the vertices, these should all be normalised so that the shape fits within a unit hypersphere

```
"vertices":[
    [Float, Float, Float, Float],
    [Float, Float, Float, Float],
    [Float, Float, Float, Float],
    [Float, Float, Float, Float],
    ...
],
```

### faces

List of vertex sets that enclose a face. The vertices are listed in traversal order, so any adjacent pair of vertices is an edge of the face. Faces can have any number of vertices > 3,
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

### volumes

List of face sets that enclose a volume

```
"volumes":[
  [Int, Int, Int, Int, ...],
  [Int, Int, Int, Int, ...],
  [Int, Int, Int, Int, ...],
  [Int, Int, Int, Int, ...],
  ...
],
```

### optimalThickness

Optimum thickness to use when rendering edges of the shape. Currently it's calculated as `cbrt(avg_face_area) * 0.05` (for no reason in particular)
