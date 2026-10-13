// Lecturer's assessment pack for the inspection practical:
//   JSU (table of specifications), reflection answer scheme, assessor reference for the
//   record form, and CQI plan with report template.
//   -> docs/MARISMART_Pek_Penilaian_JSU_Skema_CQI.docx (then converted to PDF)
// Usage: node scripts/make_assessment_pack.js
const fs = require('fs');
const path = require('path');
const { Document, Packer, TextRun, AlignmentType, PageBreak, Paragraph } = require('docx');
const { OUT, FONT, W, C, p, cell, table, heading, blank, NUMBERING, PAGE, pageHeader, pageFooter } = require('./docx_common');

const H = (t, i, w, o = {}) => cell(t, w[i], { fill: C.head, bold: true, size: 16, bilingual: false, ...o });
const T = (t, w, o = {}) => cell(t, w, { size: 16, bilingual: false, ...o });
const note = (t) => p(t, { size: 16, color: C.muted, bilingual: false, after: 80 });
const bullet = (t) => p(t, { bullet: true, size: 17, bilingual: false, after: 30 });
const gap = () => p('', { after: 60 });

// --------------------------------------------------------------- 1. Overview
const ovW = [3000, 6906];
const overview = table(ovW, [
  ['Komponen penilaian', 'Amali: pemeriksaan luaran set pam dan rekod bacaan terkini (Inspection Studio)'],
  ['Instrumen', 'Borang Rekod Pemeriksaan (Bahagian A, B, Serahan), Rubrik C1–C6 (Bahagian C), Refleksi R1–R3 (Bahagian D)'],
  ['Kaedah', 'Pemerhatian langsung oleh penilai, semakan dokumen (borang) dan jawapan bertulis (refleksi)'],
  ['Tempoh (cadangan)', 'Kira-kira 20 minit amali bagi setiap pelajar dan 15 minit refleksi'],
  ['Bahan sokongan', 'Video MARISMART Klip 4 (walkthrough), Klip 5 (semakan kendiri) dan Klip 6 (rekod bacaan terkini)'],
  ['Pengiraan markah akhir', 'Markah akhir (/100) = 0.8 × Jumlah rubrik (/100) + Refleksi (/20)'],
  ['Keputusan kompetensi', 'KOMPETEN jika jumlah rubrik ≥ 60 DAN C2 serta C4 sekurang-kurangnya Tahap 3. Sebarang tindakan tidak selamat (C2 Tahap 1) = BELUM KOMPETEN.'],
].map(([k, v]) => ({ cells: [T(k, ovW[0], { bold: true, fill: C.soft }), T(v, ovW[1])] })));

// --------------------------------------------------------------- 2. CLO
const cloW = [900, 5106, 1700, 2200];
const clo = table(cloW, [
  { header: true, cells: ['CLO', 'Pernyataan (cadangan)', 'Domain / tahap', 'Kluster MQF 2.0 / PLO'].map((t, i) => H(t, i, cloW)) },
  { cells: [T('CLO1', cloW[0], { bold: true }), T('Melaksanakan pemeriksaan luaran dan merekod bacaan instrumen dengan tepat serta lengkap mengikut prosedur.', cloW[1]), T('Psikomotor P3 (Ketepatan, Dave)', cloW[2]), T('C3a Kemahiran praktikal · PLO__', cloW[3])] },
  { cells: [T('CLO2', cloW[0], { bold: true }), T('Mempamerkan amalan kerja selamat dan tanggungjawab semasa serahan rekod kepada orang diberi kuasa.', cloW[1]), T('Afektif A3 (Menilai, Krathwohl)', cloW[2]), T('C5 Etika & profesionalisme; C3c Komunikasi · PLO__', cloW[3])] },
  { cells: [T('CLO3', cloW[0], { bold: true }), T('Menganalisis ketidakpastian bacaan dan mewajarkan keputusan berkaitan data yang direkod.', cloW[1]), T('Kognitif C4 (Menganalisis, Bloom semakan)', cloW[2]), T('C2 Kemahiran kognitif · PLO__', cloW[3])] },
]);

// --------------------------------------------------------------- 3. JSU (item level)
const items = [
  // code, item, CLO, domain, content, clip, raw marks, final %
  ['C1', 'Persediaan dan pengenalpastian peralatan', 'CLO1', 'P2 Manipulasi', 'Tag, skop, titik pemerhatian', 'Klip 4, 6 (langkah 02)', '10', 8],
  ['C2', 'Amalan keselamatan dan akses (kritikal)', 'CLO2', 'A3 Menilai', 'Pemerhatian luaran, pengadang, akses', 'Klip 4, 6 (langkah 01)', '20', 16],
  ['C3', 'Teknik bacaan instrumen', 'CLO1', 'P3 Ketepatan', 'Paralaks, resolusi skala, bacaan semula', 'Klip 6 (langkah 03)', '20', 16],
  ['C4', 'Kelengkapan dan ketepatan data', 'CLO1', 'P3 Ketepatan', 'Titik, nilai, unit, masa, rujukan, bacaan terkini', 'Klip 6 (langkah 03, 05)', '25', 20],
  ['C5', 'Dapatan dan ketidakpastian', 'CLO3', 'C4 Menganalisis', 'Dapatan, sumber ketidakpastian', 'Klip 6 (langkah 05)', '10', 8],
  ['C6', 'Serahan dan kebolehkesanan', 'CLO2', 'A2 Bertindak balas', 'Orang diberi kuasa, rujukan, tandatangan', 'Klip 6 (langkah 05)', '15', 12],
  ['R1', 'Sumber ketidakpastian dan kawalannya', 'CLO3', 'C4 Menganalisis', 'Paralaks, resolusi, kalibrasi', 'Klip 6', '8', 8],
  ['R2', 'Wajaran: tiada penilaian tanpa had diluluskan', 'CLO3', 'C5 Menilai', 'Had diluluskan, kebolehkesanan', 'Klip 4 (03), 6', '6', 6],
  ['R3', 'Maklumat penting semasa serahan', 'CLO3', 'C3 Mengaplikasi', 'Serahan, komunikasi gelung tertutup', 'Klip 6 (langkah 05)', '6', 6],
];
const jW = [560, 2240, 700, 1300, 1826, 1400, 1000, 880];
const jsu = table(jW, [
  { header: true, cells: ['Item', 'Kriteria / soalan', 'CLO', 'Domain / tahap', 'Kandungan dinilai', 'Rujukan video', 'Markah mentah', '% markah akhir'].map((t, i) => H(t, i, jW)) },
  ...items.map((r) => ({ cells: r.map((v, i) => T(String(v), jW[i], { bold: i === 0, align: i >= 6 ? AlignmentType.CENTER : undefined })) })),
  { cells: [T('JUMLAH', jW[0] + jW[1] + jW[2] + jW[3] + jW[4] + jW[5], { span: 6, bold: true, fill: C.soft }), T('100 + 20', jW[6], { bold: true, fill: C.soft, align: AlignmentType.CENTER }), T('100', jW[7], { bold: true, fill: C.soft, align: AlignmentType.CENTER })] },
]);

// JSU matrix (CLO x domain level), values = % of final mark.
const levels = ['P2', 'P3', 'A2', 'A3', 'C3', 'C4', 'C5'];
const matrix = { CLO1: { P2: 8, P3: 36 }, CLO2: { A2: 12, A3: 16 }, CLO3: { C3: 6, C4: 16, C5: 6 } };
const mW = [1300, ...levels.map(() => 1000), 1606];
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const colTotals = levels.map((l) => Object.values(matrix).reduce((a, m) => a + (m[l] || 0), 0));
const jsuMatrix = table(mW, [
  { header: true, cells: [H('CLO \\ Tahap', 0, mW), ...levels.map((l, i) => H(l, i + 1, mW, { align: AlignmentType.CENTER })), H('Jumlah %', levels.length + 1, mW, { align: AlignmentType.CENTER })] },
  ...Object.entries(matrix).map(([k, m]) => ({ cells: [T(k, mW[0], { bold: true }), ...levels.map((l, i) => T(m[l] ? String(m[l]) : '–', mW[i + 1], { align: AlignmentType.CENTER })), T(String(sum(m)), mW[levels.length + 1], { bold: true, align: AlignmentType.CENTER })] })),
  { cells: [T('Jumlah %', mW[0], { bold: true, fill: C.soft }), ...colTotals.map((v, i) => T(String(v), mW[i + 1], { bold: true, fill: C.soft, align: AlignmentType.CENTER })), T(String(colTotals.reduce((a, b) => a + b, 0)), mW[levels.length + 1], { bold: true, fill: C.soft, align: AlignmentType.CENTER })] },
]);
if (colTotals.reduce((a, b) => a + b, 0) !== 100) throw new Error('JSU matrix does not total 100');
if (items.reduce((a, r) => a + r[7], 0) !== 100) throw new Error('JSU items do not total 100');

const domW = [3300, 2200, 4406];
const domainSplit = table(domW, [
  { header: true, cells: ['Domain', '% markah akhir', 'Ulasan'].map((t, i) => H(t, i, domW)) },
  { cells: [T('Psikomotor (CLO1)', domW[0], { bold: true }), T('44', domW[1], { align: AlignmentType.CENTER }), T('Dominan, sesuai untuk penilaian amali TVET.', domW[2])] },
  { cells: [T('Afektif (CLO2)', domW[0], { bold: true }), T('28', domW[1], { align: AlignmentType.CENTER }), T('Keselamatan dan tanggungjawab serahan; C2 juga menjadi syarat kompetensi.', domW[2])] },
  { cells: [T('Kognitif (CLO3)', domW[0], { bold: true }), T('28', domW[1], { align: AlignmentType.CENTER }), T('Aras tinggi (C4–C5) sebanyak 22% daripada 28%.', domW[2])] },
]);

// --------------------------------------------------------------- 4. Reflection answer scheme
function scheme(code, q, marks, points, model, reject) {
  const sW = [7406, 2500];
  return [
    p([new TextRun({ text: `${code}. `, bold: true, size: 20, font: FONT, color: C.s05 }), new TextRun({ text: q, bold: true, size: 20, font: FONT, color: C.ink }),
      new TextRun({ text: `  [${marks} markah]`, size: 18, font: FONT, color: C.muted })], { before: 120, after: 60 }),
    table(sW, [
      { header: true, cells: [H('Titik pemarkahan (terima jawapan setara)', 0, sW), H('Markah', 1, sW, { align: AlignmentType.CENTER })] },
      ...points.map(([t, m]) => ({ cells: [T(t, sW[0]), T(m, sW[1], { align: AlignmentType.CENTER })] })),
      { cells: [T('Maksimum', sW[0], { bold: true, fill: C.soft }), T(String(marks), sW[1], { bold: true, fill: C.soft, align: AlignmentType.CENTER })] },
    ]),
    p([new TextRun({ text: 'Contoh jawapan model: ', bold: true, size: 17, font: FONT, color: C.ink }), new TextRun({ text: model, italics: true, size: 17, font: FONT, color: C.ink })], { before: 60, after: 40 }),
    p([new TextRun({ text: 'Tidak diterima / tolak markah: ', bold: true, size: 17, font: FONT, color: C.s03 }), new TextRun({ text: reject, size: 17, font: FONT, color: C.ink })], { after: 100 }),
  ];
}
const R1 = scheme('R1', 'Apakah sumber ketidakpastian terbesar dalam bacaan anda, dan bagaimana anda mengawalnya?', 8, [
  ['Mengenal pasti sekurang-kurangnya satu sumber yang relevan: paralaks, resolusi skala (senggatan terkecil), jarum berayun/getaran, status kalibrasi instrumen, ralat salinan, ketepatan masa.', '2'],
  ['Menerangkan kesan sumber tersebut ke atas nilai yang direkod (contoh: paralaks menyebabkan bacaan lebih tinggi atau lebih rendah daripada sebenar).', '2'],
  ['Langkah kawalan 1: membaca pada aras mata dan tegak lurus dengan dail.', '1'],
  ['Langkah kawalan 2: mengambil bacaan berulang dan membandingkannya; jika jarum berayun, merekod julat atau purata mengikut prosedur.', '1'],
  ['Langkah kawalan 3: menyemak tag kalibrasi atau rujukan instrumen dan merekodnya.', '1'],
  ['Langkah kawalan 4: menulis entri serta-merta di tempat bacaan dan menyatakan ketidakpastian dalam borang.', '1'],
], 'Sumber terbesar ialah paralaks kerana dail berada di atas aras mata. Paralaks boleh menyebabkan bacaan berbeza daripada nilai sebenar. Saya membaca dengan mata sejajar dan tegak lurus dengan dail, mengambil dua bacaan untuk perbandingan, menyemak tag kalibrasi, dan mencatat "paralaks dikawal; resolusi skala dinyatakan" dalam ruangan ketidakpastian.',
'Jawapan umum seperti "berhati-hati" tanpa sumber spesifik; menyatakan "tiada ketidakpastian"; mencadangkan membuka atau mengetuk instrumen.');
const R2 = scheme('R2', 'Mengapakah anda tidak boleh menilai bacaan sebagai "normal" tanpa had yang diluluskan?', 6, [
  ['"Normal" ditakrifkan oleh had yang diluluskan daripada pengeluar, prosedur atau pegawai berwibawa, bukan oleh pelajar.', '1'],
  ['Satu nilai tunggal tidak bermakna tanpa rujukan; ia bergantung kepada keadaan operasi (beban, jenis bendalir, mod operasi).', '1'],
  ['Risiko jaminan palsu: keadaan tidak normal terlepas pandang.', '1'],
  ['Risiko amaran palsu: tindakan atau gangguan yang tidak perlu.', '1'],
  ['Keputusan mesti boleh dikesan kepada sumber bertulis (kebolehkesanan dan akauntabiliti profesional).', '1'],
  ['Tindakan betul: rekod "seperti ditemui", tulis "Tiada had dibekalkan", dan rujuk kepada orang diberi kuasa.', '1'],
], 'Saya tidak mempunyai had yang diluluskan, jadi saya tidak tahu julat yang boleh diterima untuk keadaan operasi ini. Jika saya menganggap nilai itu normal, saya mungkin terlepas kerosakan; jika saya menganggapnya tidak normal, saya mungkin mencetuskan tindakan yang tidak perlu. Saya merekod nilai seperti ditemui, menulis "Tiada had dibekalkan", dan memaklumkan orang diberi kuasa supaya keputusan dibuat berdasarkan sumber yang sah.',
'Menggunakan "pengalaman", "agak-agak" atau nilai yang diingat dari peralatan lain sebagai had; membuat kesimpulan normal/tidak normal tanpa sumber.');
const R3 = scheme('R3', 'Apakah maklumat yang paling penting untuk disampaikan semasa serahan kepada orang diberi kuasa?', 6, [
  ['Data teras: titik, nilai, unit dan masa bacaan terkini, serta rujukan instrumen.', '1'],
  ['Perubahan berbanding rekod terdahulu, yang dinyatakan hanya dengan merujuk kepada had diluluskan jika ada.', '1'],
  ['Sebarang keadaan tidak normal atau tidak selamat dan tindakan yang telah diambil.', '1'],
  ['Ketidakpastian serta perkara yang tidak dapat disahkan (contoh: tiada had, titik tidak diluluskan).', '1'],
  ['Komunikasi gelung tertutup: penerima mengulang semula maklumat utama untuk pengesahan.', '1'],
  ['Pengesahan penerimaan: nama penerima, masa dan tandatangan dalam borang.', '1'],
], 'Saya serahkan bacaan terkini penunjuk tekanan (nilai, unit, masa dan tag instrumen), dan menyatakan bahawa tiada had diluluskan dibekalkan, jadi tiada penilaian dibuat. Tiada keadaan tidak selamat diperhatikan dan pengadang berada di tempatnya. Penerima mengulang semula maklumat, kemudian kami berdua menandatangani borang serahan dengan masa.',
'Serahan lisan sahaja tanpa rekod; tidak menyatakan unit atau masa; tidak menyebut perkara yang belum disahkan.');

// Holistic band (optional, for quick moderation)
const bW = [1500, 8406];
const bands = table(bW, [
  { header: true, cells: [H('Jalur', 0, bW), H('Deskriptor holistik (pilihan, untuk moderasi pantas)', 1, bW)] },
  { cells: [T('Cemerlang (≥ 85%)', bW[0], { bold: true }), T('Sumber dan kawalan spesifik; justifikasi merujuk kepada had diluluskan dan kebolehkesanan; serahan lengkap dengan pengesahan gelung tertutup.', bW[1])] },
  { cells: [T('Baik (65–84%)', bW[0], { bold: true }), T('Kebanyakan titik utama dinyatakan dengan betul; satu atau dua butiran tidak dihuraikan.', bW[1])] },
  { cells: [T('Memuaskan (50–64%)', bW[0], { bold: true }), T('Jawapan betul tetapi umum; kurang justifikasi atau langkah kawalan.', bW[1])] },
  { cells: [T('Lemah (< 50%)', bW[0], { bold: true }), T('Jawapan tidak relevan, salah konsep, atau membuat penilaian tanpa had.', bW[1])] },
]);

// --------------------------------------------------------------- 5. Assessor reference for form fields (C4)
const fW = [2600, 4306, 3000];
const fieldRef = table(fW, [
  { header: true, cells: ['Medan borang', 'Entri yang diterima (penilai semak)', 'Kesilapan biasa'].map((t, i) => H(t, i, fW)) },
  ...[
    ['Tag peralatan', 'Sepadan dengan plat tag di tapak, ditulis tepat', 'Menggunakan nama umum ("pam") tanpa tag'],
    ['Nilai', 'Dalam satu senggatan skala terkecil daripada bacaan bebas penilai yang diambil serentak (cadangan; sesuaikan dengan prosedur)', 'Dibundarkan, dianggar, atau disalin daripada rakan'],
    ['Unit', 'Sama seperti yang tertera pada dail', 'Unit tertinggal atau ditukar tanpa arahan'],
    ['Masa', 'Format hh:mm, masa bacaan sebenar (bukan masa borang diisi)', 'Masa ditulis kemudian atau dianggar'],
    ['Rujukan', 'Tag instrumen dan/atau rujukan prosedur', 'Dibiarkan kosong'],
    ['Bacaan "Terkini"', 'Jelas ditanda dan sama dengan nilai yang diserahkan', 'Bacaan terkini tidak dikenal pasti'],
    ['Perbandingan dengan had', '"Tidak berkenaan" jika tiada had dibekalkan', 'Menanda "Dalam had" tanpa sumber had'],
    ['Serahan', 'Nama penerima, masa dan dua tandatangan', 'Tiada tandatangan penerima'],
  ].map((r) => ({ cells: r.map((v, i) => T(v, fW[i], { bold: i === 0 })) })),
]);

// --------------------------------------------------------------- 6. CQI
const kW = [2000, 7906];
const kpi = table(kW, [
  { header: true, cells: [H('Petunjuk', 0, kW), H('Sasaran (cadangan; ikut dasar program / ALAM)', 1, kW)] },
  { cells: [T('Pencapaian CLO', kW[0], { bold: true }), T('≥ 70% pelajar mencapai ≥ 60% markah bagi setiap CLO (berdasarkan item dalam JSU).', kW[1])] },
  { cells: [T('Pencapaian kriteria', kW[0], { bold: true }), T('≥ 70% pelajar mencapai Tahap 3 atau 4 bagi setiap kriteria C1–C6.', kW[1])] },
  { cells: [T('Kriteria kritikal', kW[0], { bold: true }), T('Sifar tindakan tidak selamat (C2 Tahap 1); 100% bacaan terkini dikenal pasti dalam borang.', kW[1])] },
  { cells: [T('Kebolehpercayaan penilai', kW[0], { bold: true }), T('Moderasi 10–20% sampel oleh penilai kedua; percanggahan > 1 tahap pada mana-mana kriteria dibincang dan diselaraskan.', kW[1])] },
]);

const aW = [1500, 3300, 5106];
const actions = table(aW, [
  { header: true, cells: ['Pencetus', 'Punca kemungkinan', 'Tindakan penambahbaikan (CQI)'].map((t, i) => H(t, i, aW)) },
  ...[
    ['C2 rendah', 'Syarat akses tidak difahami; tergesa-gesa', 'Taklimat keselamatan berstruktur dan senarai semak pra-tugas yang ditandatangani penyelia; tayang semula Klip 4 (langkah 01); latihan simulasi sebelum amali sebenar.'],
    ['C3 rendah', 'Paralaks; tidak memahami resolusi skala', 'Latihan membaca dail daripada pelbagai sudut (foto atau instrumen latihan); gunakan paparan dekat Klip 6; semakan rakan sebaya bagi bacaan berulang.'],
    ['C4 rendah', 'Unit/masa tertinggal; bacaan terkini tidak jelas', 'Jadikan unit dan masa sebagai kotak wajib dalam borang; berikan contoh borang yang lengkap; semakan dua lapis sebelum serahan.'],
    ['C5 / R2 rendah', 'Membuat penilaian tanpa had', 'Perbincangan kes "tiada had dibekalkan"; tegaskan mesej penutup Klip 6; aktiviti jigsaw membandingkan rekod dengan dan tanpa had.'],
    ['C6 / R3 rendah', 'Serahan tidak lengkap', 'Main peranan serahan dengan komunikasi gelung tertutup; senarai semak serahan; penilaian rakan sebaya.'],
    ['R1 rendah', 'Jawapan umum', 'Berikan perancah soalan (sumber, kesan, kawalan) dan contoh jawapan beranotasi daripada skema ini.'],
    ['Kesan siling', '≥ 90% pelajar Tahap 4 dalam satu kriteria', 'Semak deskriptor rubrik supaya lebih membezakan; tambah variasi tugas (contoh: dua instrumen).'],
    ['Percanggahan penilai', 'Deskriptor kabur', 'Sesi penyelarasan penilai dengan sampel video atau borang; perhalusi deskriptor rubrik.'],
  ].map((r) => ({ cells: r.map((v, i) => T(v, aW[i], { bold: i === 0 })) })),
]);

const rW = [1000, 1000, 900, 900, 1500, 1806, 1000, 900, 900];
const cqiReport = table(rW, [
  { header: true, cells: ['Kriteria / CLO', '% capai', 'Sasaran', 'Jurang', 'Punca (analisis)', 'Tindakan', 'Pemilik', 'Tarikh', 'Bukti'].map((t, i) => H(t, i, rW)) },
  { cells: [T('Contoh: C4', rW[0], { italics: true, color: C.muted }), T('__%', rW[1], { color: C.muted }), T('70%', rW[2], { color: C.muted }), T('__', rW[3], { color: C.muted }),
    T('Unit tertinggal dalam borang', rW[4], { italics: true, color: C.muted }), T('Kotak unit wajib; contoh borang lengkap', rW[5], { italics: true, color: C.muted }), T('Pensyarah', rW[6], { color: C.muted }), T('__', rW[7], { color: C.muted }), T('Borang semakan', rW[8], { color: C.muted })] },
  ...Array.from({ length: 4 }, () => ({ h: 480, cells: rW.map((w) => blank(w)) })),
]);

const cycle = [
  bullet('Rancang: sahkan CLO, JSU dan sasaran sebelum semester; selaraskan penilai menggunakan rubrik dan skema ini.'),
  bullet('Laksana: jalankan amali; kumpulkan borang, skor rubrik dan refleksi.'),
  bullet('Semak: kira pencapaian setiap kriteria dan CLO; jalankan moderasi; analisis kesilapan biasa (lihat jadual medan borang).'),
  bullet('Tindak: pilih tindakan daripada jadual pencetus; rekod dalam templat laporan CQI; semak semula keberkesanan pada kitaran seterusnya.'),
  bullet('Integrasi AI (pilihan): gunakan alat AI untuk mengelompokkan tema kesilapan dalam jawapan refleksi tanpa data peribadi pelajar. Keputusan markah tetap dibuat oleh penilai manusia.'),
];

// --------------------------------------------------------------- document
const title = [
  p([new TextRun({ text: 'MARISMART AR · INSPECTION STUDIO · PENILAIAN AMALI', bold: true, size: 16, color: '9B2C3A', font: FONT })], { after: 40 }),
  p([new TextRun({ text: 'Pek Penilaian: JSU, Skema Jawapan dan CQI', bold: true, size: 34, font: FONT, color: C.ink })], { after: 40 }),
  p('Untuk kegunaan pensyarah dan penilai. Digunakan bersama Borang Rekod Pemeriksaan dan Rubrik. SULIT: jangan edarkan skema jawapan kepada pelajar sebelum penilaian.', { size: 17, color: C.muted, bilingual: false, after: 120 }),
];

const doc = new Document({
  creator: 'MARISMART AR', title: 'Pek Penilaian: JSU, Skema Jawapan dan CQI', numbering: NUMBERING,
  styles: { default: { document: { run: { font: FONT, size: 19 } } } },
  sections: [{
    properties: { page: PAGE },
    headers: { default: pageHeader('MARISMART AR — Pek Penilaian (SULIT)') },
    footers: { default: pageFooter('Cadangan penilaian: sesuaikan sasaran, wajaran dan kod PLO dengan dasar program dan ALAM.') },
    children: [
      ...title,
      heading('1. Maklumat penilaian berkomponen'), overview,
      heading('2. Hasil pembelajaran kursus (CLO)'), clo,
      note('Kod PLO dibiarkan kosong (PLO__) untuk diisi mengikut dokumen program. Kluster MQF 2.0 diberi sebagai panduan.'),
      new Paragraph({ children: [new PageBreak()] }),
      heading('3. Jadual Spesifikasi Ujian (JSU)'),
      p('3.1 JSU mengikut item', { bold: true, size: 19, bilingual: false }), jsu,
      note('% markah akhir: item rubrik = markah mentah × 0.8; item refleksi = markah mentah (jumlah 20).'),
      p('3.2 Matriks CLO × tahap domain (% markah akhir)', { bold: true, size: 19, bilingual: false, before: 80 }), jsuMatrix,
      note('P = psikomotor (Dave); A = afektif (Krathwohl); C = kognitif (Bloom semakan).'), gap(), domainSplit,
      new Paragraph({ children: [new PageBreak()] }),
      heading('4. Skema jawapan refleksi (Bahagian D)', C.s05),
      note('Berikan 1 markah bagi setiap titik yang dinyatakan dengan betul, sehingga markah maksimum. Terima istilah dalam Bahasa Melayu atau Bahasa Inggeris.'),
      ...R1, ...R2, ...R3,
      p('Jalur holistik', { bold: true, size: 19, bilingual: false, before: 80 }), bands,
      heading('5. Rujukan penilai untuk medan borang (kriteria C4)', C.s03), fieldRef,
      new Paragraph({ children: [new PageBreak()] }),
      heading('6. Cadangan CQI (Penambahbaikan Kualiti Berterusan)', C.s02),
      p('6.1 Petunjuk prestasi dan sasaran', { bold: true, size: 19, bilingual: false }), kpi,
      p('6.2 Pencetus dan tindakan penambahbaikan', { bold: true, size: 19, bilingual: false, before: 120 }), actions,
      p('6.3 Kitaran CQI', { bold: true, size: 19, bilingual: false, before: 120 }), ...cycle,
      p('6.4 Templat laporan CQI', { bold: true, size: 19, bilingual: false, before: 120 }), cqiReport,
      p('Disediakan oleh: ______________________   Disemak oleh (Ketua Program): ______________________   Tarikh: ____ / ____ / ______', { size: 17, before: 200, bilingual: false }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const f = path.join(OUT, 'MARISMART_Pek_Penilaian_JSU_Skema_CQI.docx');
  fs.writeFileSync(f, buf);
  console.log('written', f);
});
