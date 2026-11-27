import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { TailoredCvPayload } from "./ai";

export interface ResumePdfInput {
  title: string;
  tailoredText: string;
  structuredCv?: TailoredCvPayload | null;
  candidateName?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
}

const A4_SIZE: [number, number] = [595.28, 841.89];
const LETTER_SIZE: [number, number] = [612, 792];
const MARGIN_X = 38;
const MARGIN_TOP = 32;
const MARGIN_BOTTOM = 30;

// career-ops inspired ATS-safe palette
const INK_PRIMARY = rgb(0.102, 0.102, 0.18); // #1a1a2e
const INK_BODY = rgb(0.18, 0.18, 0.21); // #2e2e36
const INK_MUTED = rgb(0.42, 0.44, 0.48); // #6b707a
const ACCENT_TEAL = rgb(0.082, 0.506, 0.553); // hsl(187, 74%, 32%)
const ACCENT_VIOLET = rgb(0.424, 0.157, 0.678); // hsl(270, 70%, 40%)
const PILL_BG = rgb(0.925, 0.969, 0.976);
const PILL_BORDER = rgb(0.75, 0.89, 0.91);
const RULE_LIGHT = rgb(0.87, 0.88, 0.9);

const SYMBOL_MAP: Record<string, string> = {
  "\u20B9": "INR ",
  "\u20AC": "EUR ",
  "\u00A3": "GBP ",
  "\u2192": "->",
  "\u2190": "<-",
  "\u279C": "->",
  "\u2022": "-",
  "\u25CF": "-",
  "\u25AA": "-",
  "\u25E6": "-",
  "\u2713": "[x]",
  "\u2714": "[x]",
  "\u2014": "-",
  "\u2013": "-",
  "\u2212": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2026": "...",
  "\u00A0": " ",
  "\u200B": "",
  "\uFEFF": "",
};

/**
 * Normalizes Unicode symbols so StandardFonts.Helvetica (WinAnsi)
 * never throws encoding errors at render time.
 */
export function sanitizePdfText(input: string): string {
  let out = "";
  for (const ch of input) {
    if (ch in SYMBOL_MAP) {
      out += SYMBOL_MAP[ch];
    } else {
      const code = ch.charCodeAt(0);
      if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
        out += ch;
      }
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

interface RichSegment {
  text: string;
  bold: boolean;
}

interface RichWord {
  text: string;
  bold: boolean;
  width: number;
  spaceBefore: boolean;
}

function parseRichSegments(raw: string): RichSegment[] {
  const cleanInline = raw
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1");

  const segments: RichSegment[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanInline)) !== null) {
    if (match.index > lastIdx) {
      const slice = cleanInline.slice(lastIdx, match.index);
      if (slice) segments.push({ text: slice, bold: false });
    }
    if (match[1]) segments.push({ text: match[1], bold: true });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < cleanInline.length) {
    const tail = cleanInline.slice(lastIdx);
    if (tail) segments.push({ text: tail, bold: false });
  }

  return segments;
}

function wrapRichLines(
  raw: string,
  regularFont: PDFFont,
  boldFont: PDFFont,
  fontSize: number,
  maxWidth: number
): RichWord[][] {
  const segments = parseRichSegments(raw);
  const words: RichWord[] = [];
  let pendingSpace = false;

  for (const seg of segments) {
    const font = seg.bold ? boldFont : regularFont;
    // Preserve exact word-boundary spaces vs zero-space punctuation across **bold** boundaries
    const parts = seg.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        pendingSpace = true;
        continue;
      }
      const cleanToken = sanitizePdfText(part);
      if (!cleanToken) continue;
      for (const token of cleanToken.split(/\s+/).filter(Boolean)) {
        words.push({
          text: token,
          bold: seg.bold,
          width: font.widthOfTextAtSize(token, fontSize),
          spaceBefore: words.length > 0 && pendingSpace,
        });
        pendingSpace = true;
      }
      pendingSpace = false;
    }
  }

  if (words.length === 0) return [];

  const spaceWidth = regularFont.widthOfTextAtSize(" ", fontSize);
  const lines: RichWord[][] = [];
  let currentLine: RichWord[] = [];
  let currentWidth = 0;

  for (const w of words) {
    const gap = currentLine.length > 0 && w.spaceBefore ? spaceWidth : 0;
    if (currentWidth + gap + w.width <= maxWidth) {
      currentLine.push(w);
      currentWidth += gap + w.width;
    } else {
      if (currentLine.length > 0) lines.push(currentLine);
      currentLine = [{ ...w, spaceBefore: false }];
      currentWidth = w.width;
    }
  }

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

export function buildPdfFileName(companyName: string, jobTitle: string): string {
  const clean = (value: string) =>
    value
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);

  const company = clean(companyName) || "Company";
  const role = clean(jobTitle) || "Role";
  return `${company}_${role}_Tailored.pdf`;
}

class CvPdfCanvas {
  private pdfDoc: PDFDocument;
  private page: PDFPage;
  private pageWidth: number;
  private pageHeight: number;
  private y: number;
  readonly contentWidth: number;
  readonly regular: PDFFont;
  readonly bold: PDFFont;

  constructor(
    pdfDoc: PDFDocument,
    pageSize: [number, number],
    regular: PDFFont,
    bold: PDFFont
  ) {
    this.pdfDoc = pdfDoc;
    this.pageWidth = pageSize[0];
    this.pageHeight = pageSize[1];
    this.contentWidth = this.pageWidth - MARGIN_X * 2;
    this.regular = regular;
    this.bold = bold;
    this.page = pdfDoc.addPage(pageSize);
    this.y = this.pageHeight - MARGIN_TOP;
  }

  ensureSpace(neededHeight: number) {
    if (this.y - neededHeight < MARGIN_BOTTOM) {
      this.page = this.pdfDoc.addPage([this.pageWidth, this.pageHeight]);
      this.y = this.pageHeight - MARGIN_TOP;
    }
  }

  gap(points: number) {
    this.y -= points;
  }

  drawAccentGradientBar() {
    this.ensureSpace(8);
    const midX = MARGIN_X + this.contentWidth * 0.55;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: midX, y: this.y },
      thickness: 1.8,
      color: ACCENT_TEAL,
    });
    this.page.drawLine({
      start: { x: midX, y: this.y },
      end: { x: MARGIN_X + this.contentWidth, y: this.y },
      thickness: 1.8,
      color: ACCENT_VIOLET,
    });
    this.y -= 8;
  }

  drawSectionHeader(title: string) {
    const clean = sanitizePdfText(title).toUpperCase();
    if (!clean) return;
    this.y -= 4;
    // Keep heading with at least ~2 lines of following body to avoid orphaned titles
    this.ensureSpace(40);
    this.page.drawText(clean, {
      x: MARGIN_X,
      y: this.y,
      size: 9.5,
      font: this.bold,
      color: ACCENT_TEAL,
    });
    this.y -= 3.5;
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: MARGIN_X + this.contentWidth, y: this.y },
      thickness: 0.85,
      color: RULE_LIGHT,
    });
    this.y -= 10;
  }

  drawRichText(
    raw: string,
    opts?: {
      size?: number;
      lineHeight?: number;
      x?: number;
      maxWidth?: number;
      color?: ReturnType<typeof rgb>;
      bullet?: boolean;
    }
  ) {
    const size = opts?.size ?? 9.1;
    const lineHeight = opts?.lineHeight ?? 12.6;
    const baseX = opts?.x ?? MARGIN_X;
    const width = opts?.maxWidth ?? this.contentWidth - (baseX - MARGIN_X);
    const color = opts?.color ?? INK_BODY;
    const textX = opts?.bullet ? baseX + 9 : baseX;
    const wrapWidth = opts?.bullet ? width - 9 : width;

    const lines = wrapRichLines(raw, this.regular, this.bold, size, wrapWidth);
    const spaceWidth = this.regular.widthOfTextAtSize(" ", size);

    lines.forEach((words, idx) => {
      this.ensureSpace(lineHeight);
      if (opts?.bullet && idx === 0) {
        this.page.drawCircle({
          x: baseX + 2.5,
          y: this.y + size * 0.34,
          size: 1.5,
          color: ACCENT_TEAL,
        });
      }
      let cursorX = textX;
      words.forEach((word, wIdx) => {
        if (wIdx > 0 && word.spaceBefore) {
          cursorX += spaceWidth;
        }
        const font = word.bold ? this.bold : this.regular;
        this.page.drawText(word.text, {
          x: cursorX,
          y: this.y,
          size,
          font,
          color,
        });
        cursorX += word.width;
      });
      this.y -= lineHeight;
    });
  }

  drawCompetencyPills(items: string[]) {
    const cleanItems = items.map(sanitizePdfText).filter(Boolean);
    if (cleanItems.length === 0) return;

    const fontSize = 8.2;
    const padX = 7;
    const pillH = 15;
    const gapX = 5;
    const gapY = 5;

    this.ensureSpace(pillH + 4);
    let cursorX = MARGIN_X;

    for (const label of cleanItems) {
      const textW = this.bold.widthOfTextAtSize(label, fontSize);
      const pillW = Math.min(textW + padX * 2, this.contentWidth);

      if (cursorX > MARGIN_X && cursorX + pillW > MARGIN_X + this.contentWidth) {
        cursorX = MARGIN_X;
        this.y -= pillH + gapY;
        this.ensureSpace(pillH + 4);
      }

      this.page.drawRectangle({
        x: cursorX,
        y: this.y - 3.5,
        width: pillW,
        height: pillH,
        color: PILL_BG,
        borderColor: PILL_BORDER,
        borderWidth: 0.7,
      });

      this.page.drawText(label, {
        x: cursorX + padX,
        y: this.y + 1,
        size: fontSize,
        font: this.bold,
        color: ACCENT_TEAL,
      });

      cursorX += pillW + gapX;
    }

    this.y -= pillH + 2;
  }

  drawHeaderRow(
    leftText: string,
    rightText?: string,
    opts?: {
      leftColor?: ReturnType<typeof rgb>;
      leftSize?: number;
      rightSize?: number;
    }
  ) {
    const leftClean = sanitizePdfText(leftText);
    const rightClean = rightText ? sanitizePdfText(rightText) : "";
    const leftSize = opts?.leftSize ?? 10;
    const rightSize = opts?.rightSize ?? 8.6;

    this.ensureSpace(26);
    const rightW = rightClean ? this.regular.widthOfTextAtSize(rightClean, rightSize) : 0;
    const availableLeft = rightClean ? this.contentWidth - rightW - 10 : this.contentWidth;

    const lines = wrapRichLines(
      leftClean,
      this.bold,
      this.bold,
      leftSize,
      Math.max(120, availableLeft)
    );

    if (lines.length > 0) {
      let x = MARGIN_X;
      const spaceW = this.bold.widthOfTextAtSize(" ", leftSize);
      lines[0].forEach((w, idx) => {
        this.page.drawText(w.text, {
          x,
          y: this.y,
          size: leftSize,
          font: this.bold,
          color: opts?.leftColor ?? ACCENT_VIOLET,
        });
        x += w.width + (idx < lines[0].length - 1 ? spaceW : 0);
      });
      if (rightClean) {
        this.page.drawText(rightClean, {
          x: MARGIN_X + this.contentWidth - rightW,
          y: this.y,
          size: rightSize,
          font: this.regular,
          color: INK_MUTED,
        });
      }
      this.y -= 12.5;

      for (let i = 1; i < lines.length; i++) {
        this.ensureSpace(12.5);
        let cx = MARGIN_X;
        lines[i].forEach((w, idx) => {
          this.page.drawText(w.text, {
            x: cx,
            y: this.y,
            size: leftSize,
            font: this.bold,
            color: opts?.leftColor ?? ACCENT_VIOLET,
          });
          cx += w.width + (idx < lines[i].length - 1 ? spaceW : 0);
        });
        this.y -= 12.5;
      }
    }
  }

  drawBadgePill(label: string, rightEdgeX: number, y: number): number {
    const clean = sanitizePdfText(label);
    if (!clean) return 0;
    const size = 7.6;
    const padX = 6;
    const w = this.bold.widthOfTextAtSize(clean, size) + padX * 2;
    const h = 13;
    const x = rightEdgeX - w;

    this.page.drawRectangle({
      x,
      y: y - 3,
      width: w,
      height: h,
      color: PILL_BG,
      borderColor: PILL_BORDER,
      borderWidth: 0.7,
    });
    this.page.drawText(clean, {
      x: x + padX,
      y: y + 0.8,
      size,
      font: this.bold,
      color: ACCENT_TEAL,
    });
    return w;
  }

  drawTitleWithRightBadge(leftText: string, badgeLabel?: string) {
    const cleanLeft = sanitizePdfText(leftText);
    const leftSize = 9.5;
    this.ensureSpace(24);
    let badgeW = 0;
    if (badgeLabel) {
      badgeW = this.drawBadgePill(badgeLabel, MARGIN_X + this.contentWidth, this.y) + 8;
    }
    const maxW = Math.max(140, this.contentWidth - badgeW);
    const lines = wrapRichLines(cleanLeft, this.bold, this.bold, leftSize, maxW);
    const spaceW = this.bold.widthOfTextAtSize(" ", leftSize);
    lines.forEach((line) => {
      this.ensureSpace(12.5);
      let x = MARGIN_X;
      line.forEach((word, idx) => {
        if (idx > 0 && word.spaceBefore) x += spaceW;
        this.page.drawText(word.text, {
          x,
          y: this.y,
          size: leftSize,
          font: this.bold,
          color: ACCENT_VIOLET,
        });
        x += word.width;
      });
      this.y -= 12.2;
    });
  }

  drawSubRow(leftBoldText: string, rightMutedText?: string, leftColor = INK_PRIMARY) {
    const cleanLeft = sanitizePdfText(leftBoldText);
    const cleanRight = rightMutedText ? sanitizePdfText(rightMutedText) : "";
    const leftSize = 9;
    const rightSize = 8.4;

    this.ensureSpace(14);
    this.page.drawText(cleanLeft, {
      x: MARGIN_X,
      y: this.y,
      size: leftSize,
      font: this.bold,
      color: leftColor,
    });
    if (cleanRight) {
      const rw = this.regular.widthOfTextAtSize(cleanRight, rightSize);
      this.page.drawText(cleanRight, {
        x: MARGIN_X + this.contentWidth - rw,
        y: this.y,
        size: rightSize,
        font: this.regular,
        color: INK_MUTED,
      });
    }
    this.y -= 12;
  }

  drawTitleBlock(opts: {
    name: string;
    headline?: string;
    contactItems: string[];
  }) {
    const cleanName = sanitizePdfText(opts.name) || "Tailored Resume";
    this.page.drawText(cleanName, {
      x: MARGIN_X,
      y: this.y,
      size: 20,
      font: this.bold,
      color: INK_PRIMARY,
    });
    this.y -= 18;

    if (opts.headline) {
      this.drawRichText(opts.headline, {
        size: 9.8,
        lineHeight: 13,
        color: ACCENT_TEAL,
      });
      this.y -= 2;
    }

    this.drawAccentGradientBar();

    const cleanContacts = opts.contactItems.map(sanitizePdfText).filter(Boolean);
    if (cleanContacts.length > 0) {
      this.drawRichText(cleanContacts.join("  |  "), {
        size: 8.6,
        lineHeight: 12,
        color: INK_MUTED,
      });
      this.y -= 3;
    }
  }
}

function renderStructuredCv(canvas: CvPdfCanvas, cv: TailoredCvPayload) {
  const contactItems = [
    cv.candidate.location,
    cv.candidate.phone,
    cv.candidate.email,
    cv.candidate.linkedin,
    cv.candidate.github,
    cv.candidate.portfolio,
  ].filter((v): v is string => Boolean(v && v.trim()));

  canvas.drawTitleBlock({
    name: cv.candidate.name,
    headline: cv.candidate.headline,
    contactItems,
  });

  if (cv.summary.trim()) {
    canvas.drawSectionHeader("Professional Summary");
    canvas.drawRichText(cv.summary, { size: 8.9, lineHeight: 11.8 });
    canvas.gap(2);
  }

  if (cv.competencies.length > 0) {
    canvas.drawSectionHeader("Core Competencies");
    canvas.drawCompetencyPills(cv.competencies);
    canvas.gap(1);
  }

  if (cv.experience.length > 0) {
    canvas.drawSectionHeader("Work Experience");
    cv.experience.forEach((exp, idx) => {
      canvas.drawHeaderRow(exp.company, exp.dates, { leftColor: ACCENT_VIOLET, leftSize: 9.5 });
      if (exp.role || exp.location) {
        canvas.drawSubRow(exp.role || "", exp.location);
      }
      exp.bullets.forEach((b) => {
        canvas.drawRichText(b, { size: 8.8, lineHeight: 11.5, bullet: true });
      });
      if (idx < cv.experience.length - 1) canvas.gap(3);
    });
  }

  if (cv.projects.length > 0) {
    canvas.drawSectionHeader("Technical Projects");
    cv.projects.forEach((proj, idx) => {
      canvas.drawTitleWithRightBadge(proj.name, proj.badge);
      proj.bullets.forEach((b) => {
        canvas.drawRichText(b, { size: 8.8, lineHeight: 11.5, bullet: true });
      });
      if (proj.tech) {
        const cleanTech = proj.tech.replace(/,(\S)/g, ", $1");
        canvas.drawRichText(`**Tech Stack:** ${cleanTech}`, {
          size: 8.3,
          lineHeight: 11,
          color: INK_MUTED,
        });
      }
      if (idx < cv.projects.length - 1) canvas.gap(2.5);
    });
  }

  if (cv.education.length > 0) {
    canvas.drawSectionHeader("Education");
    cv.education.forEach((edu) => {
      canvas.drawHeaderRow(edu.title, edu.year, { leftColor: INK_PRIMARY, leftSize: 9.3 });
      if (edu.org || edu.location) {
        const orgLine = [edu.org, edu.location].filter(Boolean).join(" | ");
        canvas.drawRichText(orgLine, { size: 8.6, lineHeight: 11.2, color: ACCENT_VIOLET });
      }
      if (edu.description) {
        canvas.drawRichText(edu.description, { size: 8.5, lineHeight: 11.2, color: INK_MUTED });
      }
    });
  }

  if (cv.certifications.length > 0) {
    canvas.drawSectionHeader("Certifications");
    cv.certifications.forEach((cert) => {
      const line = [
        `**${cert.title}**`,
        cert.org ? `- ${cert.org}` : "",
        cert.year ? `(${cert.year})` : "",
      ]
        .filter(Boolean)
        .join(" ");
      canvas.drawRichText(line, { size: 8.6, lineHeight: 11.4, bullet: true });
    });
  }

  if (cv.awards.length > 0) {
    canvas.drawSectionHeader("Awards & Honors");
    cv.awards.forEach((aw) => {
      const line = [
        `**${aw.title}**`,
        aw.org ? `- ${aw.org}` : "",
        aw.year ? `(${aw.year})` : "",
      ]
        .filter(Boolean)
        .join(" ");
      canvas.drawRichText(line, { size: 8.6, lineHeight: 11.4, bullet: true });
    });
  }

  if (cv.skills.length > 0) {
    canvas.drawSectionHeader("Technical Skills");
    cv.skills.forEach((sk) => {
      const cleanItems = sk.items.replace(/,(\S)/g, ", $1");
      const line = sk.category ? `**${sk.category}:** ${cleanItems}` : cleanItems;
      canvas.drawRichText(line, { size: 8.6, lineHeight: 11.4 });
    });
  }
}

function renderMarkdownFallback(canvas: CvPdfCanvas, input: ResumePdfInput) {
  const rawLines = input.tailoredText.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  // Deduplicate top name line whether prefixed with `# ` or plain uppercase name
  const firstNonEmpty = rawLines.findIndex((l) => l.trim().length > 0);
  let headerName = input.candidateName || input.title;
  const contactLines: string[] = [];

  if (firstNonEmpty >= 0) {
    const first = rawLines[firstNonEmpty].trim();
    const h1 = first.match(/^#\s+(.+)$/);
    if (h1) {
      headerName = h1[1];
      index = firstNonEmpty + 1;
    } else if (first.length < 70 && !first.includes(".")) {
      headerName = first;
      index = firstNonEmpty + 1;
    }

    while (index < rawLines.length) {
      const probe = rawLines[index].trim();
      if (!probe) {
        index++;
        break;
      }
      if (/^#{1,3}\s+/.test(probe) || /^[A-Z][A-Z\s&]{3,}$/.test(probe)) {
        break;
      }
      contactLines.push(probe.replace(/\*\*/g, ""));
      index++;
    }
  }

  canvas.drawTitleBlock({
    name: headerName,
    contactItems: contactLines,
  });

  for (let i = index; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (!trimmed) {
      canvas.gap(3);
      continue;
    }

    if (sanitizePdfText(trimmed).toLowerCase() === sanitizePdfText(headerName).toLowerCase()) {
      continue;
    }

    const h2 = trimmed.match(/^##\s+(.+)$/);
    const allCapsHeader =
      !/^[-*\u2022]/.test(trimmed) &&
      trimmed.length <= 42 &&
      /^[A-Z][A-Z0-9\s&/-]{3,}$/.test(trimmed);

    if (h2 || allCapsHeader) {
      canvas.drawSectionHeader(h2 ? h2[1] : trimmed);
      continue;
    }

    const h3 = trimmed.match(/^#{3,6}\s+(.+)$/);
    if (h3) {
      canvas.ensureSpace(22);
      canvas.gap(2);
      canvas.drawRichText(`**${h3[1]}**`, {
        size: 9.5,
        lineHeight: 12.8,
        color: ACCENT_VIOLET,
      });
      continue;
    }

    const bullet = trimmed.match(/^(?:[-*\u2022]|\d+\.)\s+(.+)$/);
    if (bullet) {
      canvas.drawRichText(bullet[1], { size: 9, lineHeight: 12.2, bullet: true });
      continue;
    }

    canvas.drawRichText(trimmed, { size: 9.1, lineHeight: 12.4 });
  }
}

/**
 * Generates an ATS-friendly multi-page PDF binary styled after career-ops CV templates.
 */
export async function generateTailoredResumePdf(input: ResumePdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(sanitizePdfText(input.title) || "Tailored Resume");
  pdfDoc.setCreator("Wave Tech");
  pdfDoc.setProducer("Wave Tech PDF Engine");
  const author = input.structuredCv?.candidate.name || input.candidateName;
  if (author) pdfDoc.setAuthor(sanitizePdfText(author));

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageSize =
    input.structuredCv?.pageFormat === "letter" ? LETTER_SIZE : A4_SIZE;
  const canvas = new CvPdfCanvas(pdfDoc, pageSize, regularFont, boldFont);

  if (input.structuredCv) {
    renderStructuredCv(canvas, input.structuredCv);
  } else {
    renderMarkdownFallback(canvas, input);
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
