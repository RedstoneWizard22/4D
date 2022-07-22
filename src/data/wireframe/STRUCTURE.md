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

### edges

List of vertex pairs that form an edge

```
"edges":[
  [Int, Int],
  [Int, Int],
  [Int, Int],
  [Int, Int],
  ...
],
```

### faces

List of vertex sets that enclose a face

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
