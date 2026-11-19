# handprint-vinbox — peta alur, bukan runtime

Repo ini adalah **peta alur** HandPrint di dalam Vinbox. Ia tidak membawa
runtime, layar, server statis, atau image sendiri. Semua yang benar-benar
melihat dan bertindak ada di
[`takebox/software-agent-sdk-vinbox`](https://github.com/takebox/software-agent-sdk-vinbox)
(`pip install software-agent-sdk-vinbox`).

```text
handprint-vinbox  ──(peta alur / dokumentasi)──►  software-agent-sdk-vinbox
                                                   ├─ browser_use  (mata & tangan)
                                                   ├─ handprint.sdk (otak)
                                                   └─ agent-server (REST/WS 18000)
                                                         │
                                                         ▼
                                           Vinbox: Chromium 9222, pwsh,
                                           model bridge 4097, dashboard-7331
```

Ikatan itu dijelaskan lengkap di [VINBOX-MAP.md](VINBOX-MAP.md).

## Pembagian tugas

| Bagian | Pemilik |
|---|---|
| Layar / ruang kerja | **Vinbox** — `app/dashboard-7331` di panel tengah |
| Mata & tangan (screenshot, klik, ketik, scroll, tab) | **software-agent-sdk-vinbox** (`browser_use`, CDP `127.0.0.1:9222`) |
| Shell | **Vinbox pwsh** — `/usr/bin/pwsh`, kerja di `app/program-file` |
| Model | **Vinbox model bridge** — `127.0.0.1:4097/v1` |
| Server REST/WS | **software-agent-sdk-vinbox** (`agent-server`, loopback `18000`) |

## Yang ada di repo ini

- `src/` — peta UI HandPrint: komponen, rute, store, terjemahan, gaya. Ini
  rujukan tampilan yang dipakai Vinbox, bukan aplikasi yang dijalankan sendiri.
- `config/defaults.json` — angka kontrak (port, path) yang harus sama dengan
  kontrak Vinbox.
- `specs/`, `docs/`, `.agents/` — spesifikasi dan catatan alur.
- `__tests__/` — tes unit/komponen untuk peta UI.

## Yang sudah dihapus (dan tidak kembali)

| Dihapus | Alasan |
|---|---|
| `build/` | hasil build frontend HandPrint; UI yang dipakai adalah dashboard Vinbox |
| `bin/agent-vinbox.mjs` | launcher npm yang menjalankan stack sendiri |
| `scripts/static-server.mjs` | server statis untuk layar HandPrint sendiri |
| `scripts/dev-static.mjs` | launcher yang bergantung pada server statis itu |
| `scripts/static-build.mjs` | helper build env untuk server statis itu |
| `docker/` (+ `scripts/docker-build.mjs`) | jalur image lama; image Vinbox dibangun dari `G:\vinbox\Dockerfile` |
| `tests/e2e/`, `playwright*.config.ts`, tes peluncur | menguji stack yang sudah tidak ada |

## Pemeriksaan

```bash
npm run lint     # typecheck + eslint + prettier
npm test         # vitest untuk peta UI
```

Keduanya tidak memerlukan launcher, Docker, atau server statis.

## Lisensi

MIT. Diturunkan dari HandPrint (MIT) dan diubah agar hanya menjadi peta alur di
dalam Vinbox.
