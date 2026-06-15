# GeoCognition

A calm, focused desktop app for mastering world geography (capitals + flags)
with SM-2 spaced repetition. Built with Tauri 2, Rust, React 18, and
TypeScript. Single user, fully offline.

## Development

Requirements: Rust ≥ 1.78, Node ≥ 20, pnpm ≥ 9, Tauri CLI ≥ 2.0.

```powershell
pnpm install
pnpm tauri dev
```

## Quality gates

```powershell
pnpm lint
pnpm test:unit
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

## License

MIT — see [LICENSE](LICENSE).
