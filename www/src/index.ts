import { Universe, Cell, wasmInitConfig } from 'wasm_game_of_life';
import { memory } from 'wasm_game_of_life/wasm_game_of_life_bg.wasm';
import renderShader from './shader/render.wgsl';
import { renderByCanvas2D } from './renderByCanvas2D';

wasmInitConfig();

export const CELL_SIZE = 4; // px

// Construct the universe, and get its width and height.
export const universe = new Universe() as Universe;
export const width = universe.width();
export const height = universe.height();

// Give the canvas room for all of our cells and a 1px border
// around each of them.
const canvas = document.getElementById('game-of-life-canvas') as HTMLCanvasElement;
canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

let renderCallback: () => void;

if (!navigator.gpu) {
    renderCallback = () =>
        renderByCanvas2D(canvas.getContext('2d') as CanvasRenderingContext2D, universe);
    console.info('WebGPU is not supported. Use Canvas2D to render.');
} else {
    console.info('WebGPU is supported.');

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error('No appropriate GPUAdapter found.');

    const device: GPUDevice = await adapter.requestDevice();

    const context = canvas.getContext('webgpu');
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    if (!context) throw new Error('WebGPU context lost.');

    context.configure({
        device: device,
        format: canvasFormat,
    });

    // prettier-ignore
    const vertices = new Float32Array([
        //   X,    Y,
        -0.8, -0.8, // Triangle 1 (right bottom)
        0.8, -0.8,
        0.8,  0.8,

        -0.8, -0.8, // Triangle 2 (left top)
        0.8,  0.8,
        -0.8,  0.8,
    ]);

    const vertexBuffer: GPUBuffer = device.createBuffer({
        label: 'Cell vertices',
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: vertices.BYTES_PER_ELEMENT * 2,
        attributes: [
            {
                format: 'float32x2',
                offset: 0,
                shaderLocation: 0, // Position, see vertex shader
            },
        ],
    };

    const cellShaderModule = device.createShaderModule({
        label: 'Cell shader',
        code: renderShader,
    });

    const cellPipeline = device.createRenderPipeline({
        label: 'Cell pipeline',
        layout: 'auto',
        vertex: {
            module: cellShaderModule,
            entryPoint: 'vertexMain',
            buffers: [vertexBufferLayout],
        },
        fragment: {
            module: cellShaderModule,
            entryPoint: 'fragmentMain',
            targets: [
                {
                    format: canvasFormat,
                },
            ],
        },
    });

    // Create a uniform buffer that describes the grid.
    const uniformArray = new Float32Array([universe.width(), universe.height()]);
    const uniformBuffer = device.createBuffer({
        label: 'Grid Uniforms',
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    // Create two storage buffers to hold the cell state.
    const cellStateStorage = [
        device.createBuffer({
            label: 'Cell State A',
            size: Uint32Array.BYTES_PER_ELEMENT * width * height,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }),
        device.createBuffer({
            label: 'Cell State B',
            size: Uint32Array.BYTES_PER_ELEMENT * width * height,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        }),
    ];

    const bindGroups = [
        device.createBindGroup({
            label: 'Cell renderer bind group A',
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: uniformBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: cellStateStorage[0] },
                },
            ],
        }),
        device.createBindGroup({
            label: 'Cell renderer bind group B',
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: uniformBuffer },
                },
                {
                    binding: 1,
                    resource: { buffer: cellStateStorage[1] },
                },
            ],
        }),
    ];

    let step = 0; // Track how many simulation steps have been run

    function renderByWebGPU() {
        encodeCommands();
        universe.tick();
    }

    function encodeCommands() {
        let cellStateArray = new Uint32Array(
            getUniverseStateFrom(universe, memory.buffer)
        );
        device.queue.writeBuffer(cellStateStorage[step % 2], 0, cellStateArray);

        step++; // Increment the step count

        // Start a render pass
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: context!.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 5 / 255, g: 25 / 255, b: 55 / 255, a: 1.0 },
                    storeOp: 'store',
                },
            ],
        });

        // Draw the grid.
        pass.setPipeline(cellPipeline);
        pass.setBindGroup(0, bindGroups[step % 2]); // Updated!
        pass.setVertexBuffer(0, vertexBuffer);
        pass.draw(
            vertexBuffer.size / vertexBufferLayout.arrayStride,
            cellStateStorage[step % 2].size
        );

        // End the render pass and submit the command buffer
        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    renderCallback = renderByWebGPU;
}

const fps = new (class {
    fps: HTMLElement | null;
    frames: number[];
    lastFrameTimeStamp: DOMHighResTimeStamp;

    constructor() {
        this.fps = document.getElementById('fps');
        this.frames = [];
        this.lastFrameTimeStamp = window.performance.now();
    }

    render() {
        // Convert the delta time since the last frame render into a measure
        // of frames per second.
        const now = window.performance.now();
        const delta = now - this.lastFrameTimeStamp;
        this.lastFrameTimeStamp = now;
        const fps = (1 / delta) * 1000;

        // Save only the latest 100 timings.
        this.frames.push(fps);
        if (this.frames.length > 100) {
            this.frames.shift();
        }

        // Find the max, min, and average of our 100 latest timings.
        let min = Infinity;
        let max = -Infinity;
        let sum = this.frames.reduce((acc, currentValue) => {
            min = Math.min(currentValue, min);
            max = Math.max(currentValue, max);

            return acc + currentValue;
        }, 0);
        let average = sum / this.frames.length;

        // Render the statistics.
        this.fps!.textContent = `
Simulation by WebAssembly
Render by ${navigator.gpu ? 'WebGPU' : 'Canvas2D'}

Frames per Second:
latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(average)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
    }
})();

let animationId: DOMHighResTimeStamp | null = null;

const renderLoop = () => {
    fps.render();

    renderCallback();

    animationId = window.requestAnimationFrame(renderLoop);
};

const isPaused = () => {
    return animationId === null;
};

const playPauseButton = document.getElementById('play-pause') as HTMLElement;

const play = () => {
    playPauseButton.textContent = '⏸';
    renderLoop();
};

const pause = () => {
    playPauseButton.textContent = '▶';
    window.cancelAnimationFrame(animationId!);
    animationId = null;
};

playPauseButton.addEventListener('click', () => {
    if (isPaused()) {
        play();
    } else {
        pause();
    }
});

canvas.addEventListener('click', (event) => {
    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

    universe.toggle_cell(row, col);
});

play();

export function getUniverseStateFrom(
    universe: Universe,
    buffer: ArrayBufferLike
): Uint8Array {
    let cellsPtr = universe.cells();
    // it was represented as Uint8Array in wasm
    return new Uint8Array(buffer, cellsPtr, width * height);
}
