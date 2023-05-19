# wasm_game_of_life

[Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) simulated with Rust and the WebAssembly, rendered with WebGPU or Canvas2D.

## Project setup

First you need to install [`wasm-pack`](https://rustwasm.github.io/wasm-pack/installer/)

## Compiles and hot-reloads for development

```shell
cargo install cargo-watch
```

```shell
cargo watch -c -w src/ -s "wasm-pack build" && cd www/ && npm install && npm run dev
```

## Compiles and minifies for production

```shell
wasm-pack build && cd www/ && npm install && npm run build
```

## Reference

- [Rust 🦀 and WebAssembly 🕸](https://rustwasm.github.io/docs/book/introduction.html)
- [Your first WebGPU app](https://codelabs.developers.google.com/your-first-webgpu-app)
