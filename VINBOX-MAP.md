# HandPrint di dalam Vinbox — peta alur, bukan runtime

Repo ini tetap dipasang sebagai **peta alur** HandPrint di dalam Vinbox. Ia tidak
menjalankan layar, server statis, atau frontend sendiri.

## Pembagian tugas yang sekarang berlaku

| Bagian | Pemilik | Keterangan |
|---|---|---|
| Layar/ruang kerja | **Vinbox** | `app/dashboard-7331` (index.html + assets/) di panel tengah |
| Mata & tangan (screenshot, klik, ketik, scroll, tab) | **software-agent-sdk-vinbox** (`vinbox-tools/handprint/tools/browser_use`) | menempel ke Chromium Vinbox via CDP `127.0.0.1:9222` |
| Shell | **Vinbox pwsh** | `/usr/bin/pwsh`, working dir `app/program-file` |
| Model | **Vinbox model bridge** | `127.0.0.1:4097/v1` → `opencode serve` 4096 / `llama-server` 8088 |
| Server REST/WS | **software-agent-sdk-vinbox** (`agent-server`) | loopback `127.0.0.1:18000` |

## Yang sudah dihapus dari repo ini

* `build/` — hasil build frontend HandPrint. **Bukan** UI yang dipakai; UI adalah
  dashboard Vinbox.
* `bin/agent-vinbox.mjs` — launcher npm yang menjalankan stack sendiri.
* `scripts/static-server.mjs`, `scripts/dev-static.mjs`,
  `scripts/static-build.mjs` — server statis, launcher, dan helper build untuk
  layar HandPrint sendiri.
* `docker/Dockerfile`, `docker/entrypoint.sh`, `scripts/docker-build.mjs` — jalur
  image lama. Digantikan stage `handprint-vinbox` di `G:\vinbox\Dockerfile`,
  yang memasang wheel dari `software-agent-sdk-vinbox`.
* `tests/e2e/`, `playwright*.config.ts`, dan tes peluncur — menguji stack yang
  sudah tidak ada.

## Ikatan ke SDK

Kontraknya satu arah:

```
handprint-vinbox  ──(peta alur / dokumentasi)──►  software-agent-sdk-vinbox
                                                    ├─ browser_use  (mata & tangan)
                                                    ├─ handprint-sdk (otak)
                                                    └─ agent-server (REST/WS 18000)
                                                          │
                                                          ▼
                                            Vinbox: Chromium 9222, pwsh,
                                            model bridge 4097, dashboard-7331
```

Semua nilai kontrak (CDP, shell, working dir, model, UI, port) dibaca dari
`vinbox-sdk/handprint/sdk/vinbox.py` di repo SDK, dan bisa dioverride lewat
variabel `VINBOX_*`.

## Yang perlu dijaga di repo ini

1. `src/` tetap menjadi rujukan tampilan: nama komponen, rute, dan label harus
   cocok dengan dashboard Vinbox.
2. `config/defaults.json` tidak boleh menyimpang dari kontrak SDK (port 4097,
   CDP 9222, port agent-server 18000, working dir `app/program-file`).
3. Tidak menambah kembali launcher, server statis, image, atau jalur desktop.
4. `npm run lint` dan `npm test` harus lolos tanpa stack tambahan.
