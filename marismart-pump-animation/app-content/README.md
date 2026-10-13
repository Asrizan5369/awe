# Kandungan Peta Fungsi Konseptual (GENERIC-1 v2.1-draft)

Kandungan dwibahasa (BM/EN) untuk lima titik pemeriksaan dalam aplikasi MARISMART.

| Fail | Kegunaan |
|---|---|
| `marismart_function_map.json` | **Kandungan utama.** Ini sahaja yang diperlukan oleh aplikasi anda. |
| `marismart_function_map.schema.json` | Skema JSON (draft 2020-12) untuk menyemak struktur. |
| `function-map.js` | Pemapar rujukan dalam JavaScript biasa (tanpa pustaka). Boleh digunakan terus atau dijadikan contoh. |
| `demo.html` | Pratonton: buka melalui pelayan web tempatan untuk melihat cara kandungan dipaparkan. |

## Struktur ringkas

- **`ui`**: semua label antara muka, contohnya "Select to explore", "Reset practice", lencana "2D fallback" dan tajuk bahagian.
- **`points[]`**: lima titik. Setiap titik mengandungi `function`, `purpose`, `observe`, `evidence`, `doNot`, `commonMistakes`, `quickCheck`, `verification` dan `links` (video dengan masa mula, serta nod GLB untuk AR).
- **`evidenceFields`**: label medan bukti, sama seperti borang rekod pemeriksaan.
- **`progression`**: tiga keadaan (*notExplored → explored → checked*). Kad 06 "Semak kendiri" dibuka selepas 5/5 titik diterokai.
- **`scenarios[]`**: tiga senario keputusan dengan maklum balas.
- **`metadata`**: pemilik kandungan, penyemak, tarikh, log perubahan, perkara belum disahkan, penjajaran CLO dan STCW, pernyataan penggunaan AI, dan penafian. Medan yang belum diketahui bernilai `null`, dan aplikasi memaparkannya sebagai "Menunggu".
- **`analytics`**: pemetaan acara xAPI. **Dimatikan secara lalai** (`enabled: false`) dan hanya boleh diaktifkan selepas notis persetujuan pelajar dan kelulusan etika.

Setiap teks ialah objek `{ "ms": "...", "en": "..." }`. Bahasa lalai ialah `ms`.

## Cara memasukkan ke dalam aplikasi anda

**Pilihan A: aplikasi web anda sendiri.** Letakkan fail JSON bersama aplikasi, kemudian:

```js
import { mountFunctionMap } from './function-map.js';
const data = await (await fetch('./marismart_function_map.json')).json();
mountFunctionMap(document.getElementById('map'), data, {
  arSupported: false,          // true jika peranti menyokong AR
  videoBase: './videos/',      // folder klip MP4
  docBase: './docs/',          // folder borang PDF
  onOpenAR: (glbNode) => {},   // buka paparan AR pada nod GLB ini
  onEvent: (event, payload) => {} // hanya dipanggil jika analytics.enabled = true
});
```

**Pilihan B: aplikasi dibina dengan pembantu AI** (contohnya laman yang dijana melalui ChatGPT). Lampirkan fail JSON dan gunakan arahan ini:

> Gantikan kandungan "Conceptual Function Map" dengan fail `marismart_function_map.json` yang dilampirkan. Jangan ubah teks di dalamnya. Paparkan kesemua medan bagi setiap titik (function, purpose, observe, evidence, doNot, commonMistakes, quickCheck, verification, links) sebagai bahagian yang boleh dikembangkan. Tambah butang tukar bahasa BM/EN menggunakan medan `ms` dan `en`. Gunakan tiga keadaan kad: notExplored, explored, checked (checked hanya apabila jawapan quickCheck betul). Tambah kad 06 "Semak kendiri" yang terkunci sehingga 5/5 titik diterokai. Paparkan nilai `null` dalam metadata sebagai "Menunggu"/"Awaiting". Jangan tambah sebarang nilai operasi, had atau maklumat teknikal yang tiada dalam JSON.

## Sebelum menukar status kepada "approved"

1. Isi `metadata.contentOwner`, `smeReviewer`, `reviewDate` dan `nextReviewDate`.
2. Tambah lukisan, manual atau prosedur ke dalam `metadata.sources`.
3. Semak setiap `verification.status`. Tukar kepada `verified` hanya selepas pakar bidang mengesahkannya.
4. Jalankan semakan: `node scripts/validate_function_map.mjs`.

Skrip semakan ini memeriksa skema, kelengkapan dwibahasa, tepat satu jawapan betul bagi setiap soalan, dan bahawa fail video yang dirujuk wujud. Ia juga **menolak sebarang angka dalam teks pemerhatian, larangan dan soalan**, untuk mengelakkan nilai operasi yang direka.
