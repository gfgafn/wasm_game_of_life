# wasm_game_of_life

A game written with Rust and the WebAssembly.

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

[Rust 🦀 and WebAssembly 🕸](https://rustwasm.github.io/docs/book/introduction.html)
