@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>; 

@vertex
fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) instance: u32) -> @builtin(position) vec4f {
    let i = f32(instance);
      // Compute the cell coordinate from the instance_index
    let cell = vec2f(i % grid.x, ceil(-i / grid.x));
    let state = f32(cellState[instance]);

    let cellOffset = cell / grid * 2;
    let gridPos = (pos * state + vec2f(1, -1)) / grid + vec2f(-1, 1) + cellOffset;

    return vec4f(gridPos, 0, 1);
}

@fragment
fn fragmentMain() -> @location(0) vec4f {
    return vec4f(0, 1, 0, 1);
}
