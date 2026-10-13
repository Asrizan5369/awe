// Builds the printable practical form that matches Clip 6 field-for-field:
//   docs/MARISMART_Borang_Rekod_Pemeriksaan.docx (then converted to PDF)
// Usage: node scripts/make_record_form.js
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeightRule, BorderStyle, Footer, Header, PageNumber, PageBreak, VerticalAlign,
  LevelFormat, TabStopType,
} = require('docx');

const OUT = path.join(__dirname, '..', 'docs');
fs.mkdirSync(OUT, { recursive: true });

const FONT = 'Arial';
const W = 9906; // A4 width 11906 minus 2 x 1000 margins (DXA)
const C = { ink: '1B2430', muted: '55606E', head: 'E8ECF1', soft: 'F6F8FA', warn: 'FFF4D6',
  s01: '1F5FB8', s02: '2E9B4F', s03: 'D23B33', s04: 'F08A00', s05: '6A3FB5' };
const border = { style: BorderStyle.SINGLE, size: 4, color: '9AA3AB' };
const borders = { top: border, bottom: border, left: border, right: border };

function runs(text, o = {}) {
  // "Malay (English)" pattern: English part rendered smaller and muted.
  const m = /^(.*?)( \(([^)]*)\))$/.exec(text);
  if (m && o.bilingual !== false) {
    return [new TextRun({ text: m[1], bold: o.bold, size: o.size || 19, color: o.color || C.ink, font: FONT }),
      new TextRun({ text: ` (${m[3]})`, italics: true, size: (o.size || 19) - 3, color: o.color || C.muted, font: FONT })];
  }
  return [new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size || 19, color: o.color || C.ink, font: FONT })];
}
function p(text, o = {}) {
  return new Paragraph({ spacing: { before: o.before ?? 0, after: o.after ?? 60 }, alignment: o.align,
    children: Array.isArray(text) ? text : runs(text, o), numbering: o.bullet ? { reference: 'bul', level: 0 } : undefined,
    border: o.rule ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.ink, space: 2 } } : undefined });
}
function cell(content, w, o = {}) {
  const paras = (Array.isArray(content) ? content : [content]).map((t) => (t instanceof Paragraph ? t : p(t, o)));
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, verticalAlign: o.valign || VerticalAlign.TOP,
    shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 }, columnSpan: o.span, children: paras });
}
function table(widths, rows) {
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r) => new TableRow({ cantSplit: true, height: r.h ? { value: r.h, rule: HeightRule.ATLEAST } : undefined,
      tableHeader: r.header, children: r.cells })) });
}
function heading(text, color = C.ink) {
  return new Paragraph({ spacing: { before: 200, after: 100 }, keepNext: true,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color, space: 2 } },
    children: [new TextRun({ text, bold: true, size: 24, color, font: FONT })] });
}
const blank = (w, o = {}) => cell('', w, o);

// ---------------------------------------------------------------- content
const header = [
  p([new TextRun({ text: 'MARISMART AR · INSPECTION STUDIO · AMALI', bold: true, size: 16, color: '9B2C3A', font: FONT })], { after: 40 }),
  p([new TextRun({ text: 'Borang Rekod Pemeriksaan', bold: true, size: 36, font: FONT, color: C.ink }),
    new TextRun({ text: '  Inspection Record', italics: true, size: 26, font: FONT, color: C.muted })], { after: 40 }),
  p('Pemeriksaan luaran set pam (pump skid): mengambil dan merekod bacaan terkini. Borang ini sepadan dengan medan dalam video Klip 6.', { size: 18, color: C.muted, after: 120, bilingual: false }),
];

const idWidths = [2100, 2853, 2100, 2853];
const idTable = table(idWidths, [
  { h: 420, cells: [cell('Nama pelajar (Student name)', 2100, { fill: C.soft, bold: true }), blank(2853), cell('No. matrik (Student ID)', 2100, { fill: C.soft, bold: true }), blank(2853)] },
  { h: 420, cells: [cell('Kumpulan (Group)', 2100, { fill: C.soft, bold: true }), blank(2853), cell('Tarikh (Date)', 2100, { fill: C.soft, bold: true }), cell('____ / ____ / ________', 2853, { color: C.muted })] },
  { h: 420, cells: [cell('Penyelia (Supervisor)', 2100, { fill: C.soft, bold: true }), blank(2853), cell('Lokasi / peralatan (Location / equipment)', 2100, { fill: C.soft, bold: true }), blank(2853)] },
]);

const safety = table([W], [{ cells: [cell([
  p('Syarat keselamatan sebelum bermula (Safety conditions before starting)', { bold: true, size: 19 }),
  p('Pemerhatian luaran sahaja. Jangan sentuh, laraskan atau buka sebarang bahagian peralatan.', { bullet: true, size: 18, bilingual: false }),
  p('Mulakan hanya selepas penyelia mengesahkan skop tugas, titik pemerhatian yang dibenarkan dan keperluan akses selamat.', { bullet: true, size: 18, bilingual: false }),
  p('Rekod nilai TEPAT seperti yang dibaca pada instrumen sebenar. Jangan menganggar, membundarkan atau menyalin nilai rakan.', { bullet: true, size: 18, bilingual: false }),
  p('Jika anda melihat keadaan tidak normal atau tidak selamat, berhenti dan maklumkan penyelia dengan segera.', { bullet: true, size: 18, bilingual: false }),
], W, { fill: C.warn })] }]);

// Section A: one row per field, exactly as in Clip 6 (RECORD_STEPS).
const aW = [3000, 6906];
function stepHead(tag, title, color) {
  return { cells: [cell([p([new TextRun({ text: ` ${tag} `, bold: true, color: 'FFFFFF', size: 18, font: FONT, shading: { type: ShadingType.CLEAR, fill: color, color: 'auto' } }),
    new TextRun({ text: '  ' + title, bold: true, size: 20, color, font: FONT })], { after: 0 })], W, { span: 2, fill: C.soft })] };
}
function field(label, hint, h = 440) {
  return { h, cells: [cell(label, aW[0], { bold: true }), cell([p(hint, { italics: true, size: 15, color: '8A939C', bilingual: false })], aW[1])] };
}
const sectionA = table(aW, [
  stepHead('02', 'Persediaan: kenal pasti peralatan (Prepare: identify the equipment)', C.s02),
  field('Tag peralatan (Equipment tag)', 'seperti pada plat tag di tapak'),
  field('Skop tugas (Task scope)', 'contoh: pemerhatian luaran sahaja'),
  field('Titik pemerhatian (Observation points)', 'seperti yang diberi taklimat oleh penyelia'),
  stepHead('01', 'Akses selamat: pemacu dan pengadang (Safe access: drive and guard)', C.s01),
  { h: 440, cells: [cell('Pengadang di tempatnya (Guard in place)', aW[0], { bold: true }), cell('☐ Ya (Yes)      ☐ Tidak (No)      — tanda seperti yang diperhatikan', aW[1], { bilingual: false })] },
  field('Keadaan luaran (External condition)', 'huraikan apa yang dilihat; tanpa sentuhan', 700),
  stepHead('03', 'Ambil bacaan: penunjuk tekanan (Take the reading: pressure indicator)', C.s03),
  field('Titik (Point)', 'contoh: penunjuk tekanan, tapping paip atas'),
  field('Nilai (Value)', 'tulis TEPAT seperti dibaca, pada aras mata dan tegak lurus dengan dail'),
  field('Unit (Unit)', 'seperti yang tertera pada dail'),
  field('Masa (Time)', 'hh:mm'),
  field('Rujukan (Reference)', 'tag instrumen / rujukan prosedur'),
  stepHead('04', 'Pemerhatian litar penyejukan (Cooling circuit observations)', C.s04),
  field('Titik suhu / air (Temperature / water points)', 'rekod hanya di titik yang diluluskan; tulis "tiada yang diluluskan" jika berkenaan', 600),
  stepHead('05', 'Rekod dan serah (Record and hand over)', C.s05),
  field('Dapatan (Findings)', 'seperti ditemui; huraikan sebarang ketidaknormalan', 800),
  field('Ketidakpastian (Uncertainty)', 'contoh: paralaks, resolusi skala, getaran jarum', 600),
  field('Rujukan sumber (Source references)', 'lukisan / manual / prosedur'),
  field('Orang diberi kuasa dimaklumkan (Authorised person informed)', 'nama dan masa'),
  field('Tandatangan pemerhati (Observer signature)', 'nama / no. matrik pelajar'),
]);

// Section B: repeated readings, so the LATEST entry is identifiable for handover.
const bW = [1100, 1700, 1500, 1300, 2306, 2000];
const bHead = ['Bacaan (Reading)', 'Nilai (Value)', 'Unit (Unit)', 'Masa (Time)', 'Pemerhati (Observer)', 'Catatan (Remarks)'];
const sectionB = table(bW, [
  { header: true, cells: bHead.map((t, i) => cell(t, bW[i], { fill: C.head, bold: true, size: 17 })) },
  ...['1', '2', '3'].map((n) => ({ h: 460, cells: [cell(n, bW[0], { align: AlignmentType.CENTER }), ...bW.slice(1).map((w) => blank(w))] })),
  { h: 520, cells: [cell('Terkini (Latest)', bW[0], { bold: true, fill: 'EDE7F6', size: 17 }), ...bW.slice(1).map((w) => blank(w, { fill: 'F7F4FC' }))] },
]);
const cmpW = [3400, 6506];
const compare = table(cmpW, [
  { h: 440, cells: [cell('Nilai rekod terdahulu dari log (Previous logged value)', cmpW[0], { bold: true }), blank(cmpW[1])] },
  { h: 440, cells: [cell('Had diluluskan dan sumbernya (Approved limits and source)', cmpW[0], { bold: true }), cell([p('Jika tiada had diluluskan, tulis "Tiada had dibekalkan" dan JANGAN buat sebarang penilaian.', { italics: true, size: 15, color: '8A939C', bilingual: false })], cmpW[1])] },
  { h: 440, cells: [cell('Perbandingan dengan had (Comparison against limits)', cmpW[0], { bold: true }), cell('☐ Dalam had (Within)    ☐ Luar had (Outside), maklumkan segera    ☐ Tidak berkenaan, tiada had (Not applicable)', cmpW[1], { size: 17, bilingual: false })] },
]);

const handW = [2476, 2477, 2476, 2477];
const handover = table(handW, [
  { header: true, cells: ['Diserahkan oleh (Handed over by)', 'Diterima oleh (Received by)', 'Masa (Time)', 'Tandatangan (Signature)'].map((t, i) => cell(t, handW[i], { fill: C.head, bold: true, size: 17 })) },
  { h: 600, cells: handW.map((w) => blank(w)) },
]);

// Section C: analytic rubric (4 levels) with weights.
const R = [
  ['C1', 'Persediaan dan pengenalpastian peralatan', 10,
    'Tag, skop dan semua titik pemerhatian disahkan dan direkod tepat sebelum mendekati peralatan.',
    'Tag dan skop direkod; satu titik pemerhatian tidak lengkap.',
    'Maklumat persediaan separa; perlu digesa oleh penyelia.',
    'Tiada pengesahan tag atau skop sebelum bermula.'],
  ['C2', 'Amalan keselamatan dan akses (kritikal)', 20,
    'Mematuhi semua syarat; pemerhatian luaran sahaja; status pengadang direkod; tiada sentuhan.',
    'Mematuhi syarat dengan peringatan kecil; tiada tindakan tidak selamat.',
    'Memerlukan beberapa peringatan; rekod status pengadang tidak lengkap.',
    'Sebarang tindakan tidak selamat (contoh: menyentuh atau membuka peralatan). Aktiviti DIHENTIKAN.'],
  ['C3', 'Teknik bacaan instrumen', 20,
    'Membaca pada aras mata, tegak lurus dengan dail; mengenal pasti resolusi skala; bacaan dibuat semula untuk pengesahan.',
    'Teknik betul; tidak menyatakan resolusi skala.',
    'Teknik tidak konsisten; risiko paralaks tidak dikawal.',
    'Bacaan dianggar atau dibaca dari sudut serong.'],
  ['C4', 'Kelengkapan dan ketepatan data', 25,
    'Titik, nilai, unit, masa dan rujukan lengkap dan sah; nilai sepadan dengan semakan penyelia; bacaan terkini jelas ditanda.',
    'Semua medan lengkap; satu kesilapan kecil format atau masa.',
    'Satu medan utama (nilai, unit atau masa) hilang atau salah.',
    'Data tidak lengkap, direka atau disalin.'],
  ['C5', 'Dapatan dan ketidakpastian', 10,
    'Dapatan jelas; sumber ketidakpastian dikenal pasti dan dinyatakan; tiada penilaian dibuat tanpa had diluluskan.',
    'Dapatan jelas; ketidakpastian dinyatakan secara umum.',
    'Dapatan kabur; ketidakpastian tidak dinyatakan.',
    'Membuat kesimpulan "normal/tidak normal" tanpa had diluluskan.'],
  ['C6', 'Serahan dan kebolehkesanan', 15,
    'Orang diberi kuasa dimaklumkan dengan nama dan masa; rujukan sumber dan tandatangan lengkap; serahan lisan ringkas dan tepat.',
    'Serahan lengkap; satu butiran kebolehkesanan hilang.',
    'Serahan dibuat tetapi rekod tidak lengkap.',
    'Tiada serahan atau orang diberi kuasa tidak dimaklumkan.'],
];
const rW = [600, 1560, 840, 1726, 1726, 1727, 1727];
const rubric = table(rW, [
  { header: true, cells: [
    cell('Kod', rW[0], { fill: C.head, bold: true, size: 16 }), cell('Kriteria (Criterion)', rW[1], { fill: C.head, bold: true, size: 16 }),
    cell('Wajaran %', rW[2], { fill: C.head, bold: true, size: 16, bilingual: false }),
    cell('4 Cemerlang (Excellent)', rW[3], { fill: 'E3F2E8', bold: true, size: 16 }), cell('3 Baik (Good)', rW[4], { fill: 'EEF5E6', bold: true, size: 16 }),
    cell('2 Memuaskan (Satisfactory)', rW[5], { fill: 'FFF4D6', bold: true, size: 16 }), cell('1 Perlu penambahbaikan (Needs improvement)', rW[6], { fill: 'FDE7E5', bold: true, size: 16 })] },
  ...R.map((r) => ({ cells: [
    cell(r[0], rW[0], { bold: true, size: 16 }), cell(r[1], rW[1], { bold: true, size: 16, bilingual: false }), cell(String(r[2]), rW[2], { size: 16, align: AlignmentType.CENTER }),
    ...r.slice(3).map((t, i) => cell(t, rW[3 + i], { size: 15, bilingual: false }))] })),
]);
const sW = [600, 3800, 1400, 1600, 2506];
const score = table(sW, [
  { header: true, cells: ['Kod', 'Kriteria', 'Tahap (1–4)', 'Wajaran %', 'Markah = Tahap ÷ 4 × Wajaran'].map((t, i) => cell(t, sW[i], { fill: C.head, bold: true, size: 16, bilingual: false })) },
  ...R.map((r) => ({ h: 380, cells: [cell(r[0], sW[0], { bold: true, size: 16 }), cell(r[1], sW[1], { size: 16, bilingual: false }), blank(sW[2]), cell(String(r[2]), sW[3], { size: 16 }), blank(sW[4])] })),
  { h: 420, cells: [cell('JUMLAH (TOTAL)', sW[0] + sW[1] + sW[2], { span: 3, bold: true, size: 17 }), cell('100', sW[3], { bold: true, size: 17 }), cell('______ / 100', sW[4], { bold: true, size: 17 })] },
]);

const decision = table([W], [{ cells: [cell([
  p('Keputusan kompetensi (Competency decision). Cadangan; sesuaikan dengan dasar program.', { bold: true, size: 19 }),
  p('KOMPETEN: jumlah ≥ 60, DAN C2 (keselamatan) serta C4 (data) sekurang-kurangnya Tahap 3.', { bullet: true, size: 18, bilingual: false }),
  p('BELUM KOMPETEN: jika mana-mana syarat di atas tidak dipenuhi. Sebarang tindakan tidak selamat (C2 Tahap 1) menjadikan keputusan BELUM KOMPETEN, tanpa mengira jumlah markah.', { bullet: true, size: 18, bilingual: false }),
  p('☐ Kompeten (Competent)        ☐ Belum kompeten (Not yet competent)', { size: 19, before: 80 }),
  p('Penilai (Assessor): ______________________   Tandatangan: ______________   Tarikh: ____ / ____ / ______', { size: 18, before: 160, bilingual: false }),
], W, { fill: C.soft })] }]);

const alignW = [2600, 7306];
const alignment = table(alignW, [
  { cells: [cell('CLO (cadangan)', alignW[0], { bold: true, fill: C.soft, bilingual: false }), cell('Melaksanakan pemeriksaan luaran ke atas set pam dan merekod bacaan instrumen dengan tepat serta lengkap mengikut prosedur yang ditetapkan. Domain psikomotor: P3, Ketepatan (Precision).', alignW[1], { size: 17, bilingual: false })] },
  { cells: [cell('PLO', alignW[0], { bold: true, fill: C.soft, bilingual: false }), cell('Petakan kepada kod PLO program anda, contohnya kemahiran praktikal dan kemahiran komunikasi/kerja berpasukan (serahan).', alignW[1], { size: 17, bilingual: false })] },
  { cells: [cell('STCW Kod Bahagian A, Jadual A-III/1', alignW[0], { bold: true, fill: C.soft, bilingual: false }), cell('Kompetensi "Maintain a safe engineering watch": tugas rutin semasa syif, penyelenggaraan log ruang jentera dan kepentingan bacaan yang diambil, serta tugas berkaitan penyerahan syif.', alignW[1], { size: 17, bilingual: false })] },
  { cells: [cell('Bahan sokongan', alignW[0], { bold: true, fill: C.soft, bilingual: false }), cell('Video MARISMART Klip 4 (walkthrough), Klip 5 (semakan kendiri) dan Klip 6 (rekod bacaan terkini).', alignW[1], { size: 17, bilingual: false })] },
]);

const reflW = [W];
const reflection = table(reflW, ['1. Apakah sumber ketidakpastian terbesar dalam bacaan anda, dan bagaimana anda mengawalnya?',
  '2. Mengapakah anda tidak boleh menilai bacaan sebagai "normal" tanpa had yang diluluskan?',
  '3. Apakah maklumat yang paling penting untuk disampaikan semasa serahan kepada orang diberi kuasa?']
  .map((q) => ({ h: 1000, cells: [cell([p(q, { size: 18, bold: true, bilingual: false })], W)] })));

const doc = new Document({
  creator: 'MARISMART AR', title: 'Borang Rekod Pemeriksaan dan Rubrik Penilaian',
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
  styles: { default: { document: { run: { font: FONT, size: 19 } } } },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } },
    headers: { default: new Header({ children: [p([new TextRun({ text: 'MARISMART AR — Borang Rekod Pemeriksaan & Rubrik', size: 14, color: C.muted, font: FONT })], { align: AlignmentType.RIGHT })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'Model pembelajaran ilustratif: isikan nilai sebenar dari instrumen sebenar; ikut prosedur tapak dan had yang diluluskan.   Halaman ', size: 14, color: C.muted, font: FONT }),
      new TextRun({ children: [PageNumber.CURRENT], size: 14, color: C.muted, font: FONT }),
      new TextRun({ text: ' / ', size: 14, color: C.muted, font: FONT }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: C.muted, font: FONT })] })] }) },
    children: [
      ...header, idTable, p('', { after: 80 }), safety,
      heading('Bahagian A — Rekod pemeriksaan (sama seperti medan Klip 6)'),
      p('Lengkapkan mengikut turutan langkah. Teks kelabu ialah panduan format; tulis entri anda di atasnya.', { size: 17, color: C.muted, bilingual: false }),
      sectionA,
      heading('Bahagian B — Bacaan berulang dan bacaan terkini', C.s03),
      p('Ambil sekurang-kurangnya dua bacaan berasingan pada titik yang sama. Baris "Terkini" ialah data yang diserahkan.', { size: 17, color: C.muted, bilingual: false }),
      sectionB, p('', { after: 80 }), compare,
      heading('Serahan (Handover)', C.s05), handover,
      new Paragraph({ children: [new PageBreak()] }),
      heading('Bahagian C — Rubrik penilaian (diisi oleh penilai)'),
      rubric, p('', { after: 80 }), score, p('', { after: 80 }), decision,
      heading('Bahagian D — Refleksi pelajar'), reflection,
      heading('Penjajaran (Alignment): untuk kegunaan pensyarah'), alignment,
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  const f = path.join(OUT, 'MARISMART_Borang_Rekod_Pemeriksaan.docx');
  fs.writeFileSync(f, buf);
  console.log('written', f);
});
