import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export interface ResumePdfInput {
  title: string;
  tailoredText: string;
  candidateName?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
}

const PAGE_WIDTH = 612; // US Letter width in points
const PAGE_HEIGHT = 792;
const MARGIN_X = 48;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 48;
const MAX_LINE_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const SYMBOL_MAP: Record<string, string> = {
  "\u20B9": "INR ", // Rupee sign
  "\u20AC": "EUR ", // Euro sign
  "\u00A3": "GBP ", // Pound sign
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
 * Normalizes Unicode punctuation/symbols so StandardFonts.Helvetica (WinAnsi)
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

function stripInlineMarkdown(line: string): string {
  return line
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
        current = word;
      } else {
        // Hard-break unusually long tokens (e.g., URLs) to stay inside margins
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, fontSize) <= maxWidth) {
            chunk += ch;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      }
    }
  }

  if (current) lines.push(current);
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

/**
 * Generates an ATS-friendly multi-page PDF binary for a tailored resume.
 */
export async function generateTailoredResumePdf(input: ResumePdfInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(sanitizePdfText(input.title) || "Tailored Resume");
  pdfDoc.setCreator("Wave Tech");
  pdfDoc.setProducer("Wave Tech PDF Engine");
  if (input.candidateName) {
    pdfDoc.setAuthor(sanitizePdfText(input.candidateName));
  }

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryInk = rgb(0.08, 0.08, 0.09);
  const bodyInk = rgb(0.18, 0.18, 0.21);
  const mutedInk = rgb(0.45, 0.45, 0.5);
  const ruleColor = rgb(0.84, 0.84, 0.87);

  let page: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < MARGIN_BOTTOM) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const drawLines = (
    lines: string[],
    opts: {
      font: PDFFont;
      size: number;
      lineHeight: number;
      color: ReturnType<typeof rgb>;
      x?: number;
      firstLinePrefix?: string;
      continuationIndent?: number;
    }
  ) => {
    const baseX = opts.x ?? MARGIN_X;
    lines.forEach((line, index) => {
      ensureSpace(opts.lineHeight);
      const drawX = index === 0 ? baseX : baseX + (opts.continuationIndent ?? 0);
      const text =
        index === 0 && opts.firstLinePrefix ? `${opts.firstLinePrefix}${line}` : line;
      page.drawText(text, {
        x: drawX,
        y,
        size: opts.size,
        font: opts.font,
        color: opts.color,
      });
      y -= opts.lineHeight;
    });
  };

  const rawLines = input.tailoredText.replace(/\r\n/g, "\n").split("\n");
  const hasExplicitH1 = rawLines.some((l) => /^#\s+/.test(l.trim()));

  if (!hasExplicitH1) {
    const headerTitle = sanitizePdfText(input.candidateName || input.title);
    const wrapped = wrapText(headerTitle, boldFont, 15, MAX_LINE_WIDTH);
    drawLines(wrapped, {
      font: boldFont,
      size: 15,
      lineHeight: 20,
      color: primaryInk,
    });
    if (input.jobTitle && input.companyName) {
      const subtitle = sanitizePdfText(`Tailored for ${input.jobTitle} — ${input.companyName}`);
      drawLines(wrapText(subtitle, regularFont, 9.5, MAX_LINE_WIDTH), {
        font: regularFont,
        size: 9.5,
        lineHeight: 14,
        color: mutedInk,
      });
    }
    y -= 4;
    ensureSpace(8);
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_WIDTH - MARGIN_X, y },
      thickness: 0.75,
      color: ruleColor,
    });
    y -= 12;
  }

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      y -= 6;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      ensureSpace(10);
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: PAGE_WIDTH - MARGIN_X, y },
        thickness: 0.5,
        color: ruleColor,
      });
      y -= 10;
      continue;
    }

    const h1Match = trimmed.match(/^#\s+(.+)$/);
    if (h1Match) {
      const clean = sanitizePdfText(stripInlineMarkdown(h1Match[1]));
      if (clean) {
        drawLines(wrapText(clean, boldFont, 16, MAX_LINE_WIDTH), {
          font: boldFont,
          size: 16,
          lineHeight: 21,
          color: primaryInk,
        });
        y -= 2;
        ensureSpace(8);
        page.drawLine({
          start: { x: MARGIN_X, y },
          end: { x: PAGE_WIDTH - MARGIN_X, y },
          thickness: 0.75,
          color: ruleColor,
        });
        y -= 10;
      }
      continue;
    }

    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      const clean = sanitizePdfText(stripInlineMarkdown(h2Match[1])).toUpperCase();
      if (clean) {
        y -= 6;
        ensureSpace(22);
        drawLines(wrapText(clean, boldFont, 10.5, MAX_LINE_WIDTH), {
          font: boldFont,
          size: 10.5,
          lineHeight: 15,
          color: primaryInk,
        });
        page.drawLine({
          start: { x: MARGIN_X, y: y + 3 },
          end: { x: PAGE_WIDTH - MARGIN_X, y: y + 3 },
          thickness: 0.5,
          color: ruleColor,
        });
        y -= 5;
      }
      continue;
    }

    const h3Match = trimmed.match(/^#{3,6}\s+(.+)$/);
    if (h3Match) {
      const clean = sanitizePdfText(stripInlineMarkdown(h3Match[1]));
      if (clean) {
        y -= 3;
        drawLines(wrapText(clean, boldFont, 10, MAX_LINE_WIDTH), {
          font: boldFont,
          size: 10,
          lineHeight: 14,
          color: primaryInk,
        });
      }
      continue;
    }

    const bulletMatch = trimmed.match(/^(?:[-*\u2022]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      const clean = sanitizePdfText(stripInlineMarkdown(bulletMatch[1]));
      if (clean) {
        const bulletIndent = 10;
        const wrapped = wrapText(clean, regularFont, 9.5, MAX_LINE_WIDTH - bulletIndent - 8);
        drawLines(wrapped, {
          font: regularFont,
          size: 9.5,
          lineHeight: 13.5,
          color: bodyInk,
          x: MARGIN_X + 6,
          firstLinePrefix: "- ",
          continuationIndent: bulletIndent,
        });
      }
      continue;
    }

    const cleanParagraph = sanitizePdfText(stripInlineMarkdown(trimmed));
    if (cleanParagraph) {
      const wrapped = wrapText(cleanParagraph, regularFont, 9.5, MAX_LINE_WIDTH);
      drawLines(wrapped, {
        font: regularFont,
        size: 9.5,
        lineHeight: 13.5,
        color: bodyInk,
      });
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
