// Shared building blocks for the printable MARISMART documents (A4, Arial, bilingual labels).
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, HeightRule, BorderStyle, VerticalAlign,
  AlignmentType, LevelFormat, Header, Footer, PageNumber,
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


const NUMBERING = { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] };
const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } };

function pageHeader(text) {
  return new Header({ children: [p([new TextRun({ text, size: 14, color: C.muted, font: FONT })], { align: AlignmentType.RIGHT })] });
}
function pageFooter(text) {
  const r = (t) => new TextRun({ text: t, size: 14, color: C.muted, font: FONT });
  return new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
    r(text + '   Halaman '), new TextRun({ children: [PageNumber.CURRENT], size: 14, color: C.muted, font: FONT }), r(' / '),
    new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: C.muted, font: FONT })] })] });
}

module.exports = { OUT, FONT, W, C, runs, p, cell, table, heading, blank, NUMBERING, PAGE, pageHeader, pageFooter };
