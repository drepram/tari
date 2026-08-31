import { toString } from "mdast-util-to-string";
import type {
  Blockquote,
  Code,
  Content,
  Delete,
  Emphasis,
  Heading,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  Strong,
  Table,
  TableCell,
  TableRow,
  Text,
} from "mdast";
import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";

type ConvertOptions = {
  poetryMode?: boolean;
  escapeLatex?: boolean;
};

const headingCommands = [
  "section",
  "subsection",
  "subsubsection",
  "paragraph",
  "subparagraph",
];

const markdownBlockPattern = /^(#{1,6}\s|>\s?|[-+*]\s|\d+[.)]\s|```|~~~|\|.*\|| {4,}|\t|[-*_]{3,}\s*$)/;

const markdownParser = unified().use(remarkParse).use(remarkGfm);

const alphabeticListMarker = "TARIALPHALISTITEM ";
const verseMarker = "TARIVERSEBLOCK ";
const verseBreakMarker = "TARIVERSEBREAK";
const attributionMarker = "TARIATTRIBUTION ";
const dotRunMarker = "TARIDOTRUN";
const latexFragmentMarker = "TARIRAWLATEX";

function protectLatexFragments(value: string): {
  markdown: string;
  fragments: string[];
} {
  const fragments: string[] = [];
  let markdown = "";

  for (let index = 0; index < value.length; index += 1) {
    const rawEnvironment = value
      .slice(index)
      .match(/^\\+begin\{(center|verse)\}[\s\S]*?\\+end\{\1\}/)?.[0];
    if (rawEnvironment) {
      markdown += `${latexFragmentMarker}${fragments.length}END`;
      fragments.push(
        rawEnvironment
          .replace(/^\\+begin/, "\\begin")
          .replace(/\\+end(?=\{(?:center|verse)\}$)/, "\\end"),
      );
      index += rawEnvironment.length - 1;
      continue;
    }

    const centerCommand = value
      .slice(index)
      .match(/^\\+(?:begin|end)\{center\}/)?.[0];
    if (centerCommand) {
      markdown += `${latexFragmentMarker}${fragments.length}END`;
      fragments.push(centerCommand.replace(/^\\+/, "\\"));
      index += centerCommand.length - 1;
      continue;
    }

    const footnoteStart = value.slice(index).match(/^\\+footnote\{/);
    if (!footnoteStart) {
      markdown += value[index];
      continue;
    }

    let depth = 0;
    let cursor = index + footnoteStart[0].length - 1;

    for (; cursor < value.length; cursor += 1) {
      if (value[cursor] === "\\") {
        cursor += 1;
        continue;
      }

      if (value[cursor] === "{") {
        depth += 1;
      } else if (value[cursor] === "}") {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }

    if (depth !== 0) {
      markdown += value[index];
      continue;
    }

    markdown += `${latexFragmentMarker}${fragments.length}END`;
    fragments.push(value.slice(index, cursor + 1).replace(/^\\+/, "\\"));
    index = cursor;
  }

  return { markdown, fragments };
}

function normalizeVerseBlocks(value: string): string {
  const lines = value.split(/\r?\n/g);
  const normalized: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const stanza: string[] = [];
    let cursor = index;

    while (
      cursor < lines.length &&
      lines[cursor].trim() !== "" &&
      lines[cursor].trim().length <= 80 &&
      !/^\(.+\)\.$/.test(lines[cursor].trim())
    ) {
      stanza.push(lines[cursor].trimEnd());
      cursor += 1;
    }

    const attribution = lines[cursor]?.trim().match(/^(\(.+\))\.$/);
    if (stanza.length >= 3 && attribution) {
      normalized.push(
        `${verseMarker}${stanza.join(verseBreakMarker)}`,
        "",
        `${attributionMarker}${attribution[1]}`,
      );
      index = cursor;
      continue;
    }

    normalized.push(lines[index]);
  }

  return normalized.join("\n");
}

function expandInlineAlphabeticLists(value: string): string {
  return value
    .split(/\r?\n/g)
    .flatMap((line) => {
      const firstItem = line.search(/(?:^|\s)a\.\s+/);
      if (firstItem < 0 || !/\s+b\.\s+/.test(line.slice(firstItem))) {
        return [line];
      }

      const prefix = line.slice(0, firstItem).trimEnd();
      const listText = line.slice(firstItem).trimStart();
      const matches = Array.from(listText.matchAll(/(?:^|\s)([a-z])\.\s+/g));

      if (matches.length < 2) {
        return [line];
      }

      const output = prefix ? [prefix, ""] : [];

      for (let index = 0; index < matches.length; index += 1) {
        const match = matches[index];
        const contentStart = (match.index ?? 0) + match[0].length;
        const contentEnd = matches[index + 1]?.index ?? listText.length;
        let content = listText.slice(contentStart, contentEnd).trim();

        if (index === matches.length - 1) {
          const trailingParagraph = content.match(/^([\s\S]*?[.!?;])\s+(?=[A-ZÀ-ÖØ-Þ])/u);
          if (trailingParagraph) {
            content = trailingParagraph[1];
            output.push(`1. ${alphabeticListMarker}${content}`);
            output.push("", listText.slice(contentStart + trailingParagraph[0].length).trim());
            return output;
          }
        }

        output.push(`1. ${alphabeticListMarker}${content}`);
      }

      return output;
    })
    .join("\n");
}

function markLineBasedAlphabeticLists(value: string): string {
  const lines = value.split(/\r?\n/g);

  return lines
    .map((line, index) => {
      const match = line.match(/^(\s*)[a-z]\.\s+(.+)$/);
      if (!match) {
        return line;
      }

      let previous = index - 1;
      while (
        previous >= 0 &&
        (lines[previous].trim() === "" || /^\s*[a-z]\.\s+/.test(lines[previous]))
      ) {
        previous -= 1;
      }

      const nested = previous >= 0 && /^\s*\d+[.)]\s+/.test(lines[previous]);
      const indentation = nested ? "    " : match[1];
      return `${indentation}1. ${alphabeticListMarker}${match[2]}`;
    })
    .join("\n");
}

function normalizePlainTextLists(value: string): string {
  return markLineBasedAlphabeticLists(
    expandInlineAlphabeticLists(normalizeVerseBlocks(value)),
  );
}

function normalizeParagraphSpacing(markdown: string, poetryMode: boolean): string {
  if (poetryMode) {
    return markdown;
  }

  const lines = markdown.split(/\r?\n/g);
  const normalized: string[] = [];
  let inCodeFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    normalized.push(line);

    if (/^(```|~~~)/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence || trimmed.length === 0 || markdownBlockPattern.test(trimmed)) {
      continue;
    }

    const nextLine = lines[index + 1];
    const nextTrimmed = nextLine?.trim() ?? "";

    if (
      nextTrimmed.length > 0 &&
      !markdownBlockPattern.test(nextTrimmed) &&
      normalized[normalized.length - 1] !== ""
    ) {
      normalized.push("");
    }
  }

  return normalized.join("\n");
}

function escapeLatexText(value: string): string {
  const escaped: string[] = [];

  for (const char of value) {
    switch (char) {
      case "\\":
        escaped.push("\\textbackslash{}");
        break;
      case "^":
        escaped.push("\\textasciicircum{}");
        break;
      case "~":
        escaped.push("\\textasciitilde{}");
        break;
      case "#":
      case "$":
      case "%":
      case "&":
      case "_":
      case "{":
      case "}":
        escaped.push(`\\${char}`);
        break;
      default:
        escaped.push(char);
    }
  }

  return escaped.join("");
}

function maybeEscape(value: string, shouldEscape: boolean): string {
  return shouldEscape ? escapeLatexText(value) : value;
}

function convertPhrasing(
  node: PhrasingContent,
  options: Required<ConvertOptions>,
): string {
  switch (node.type) {
    case "text":
      return maybeEscape((node as Text).value, options.escapeLatex);

    case "emphasis": {
      const emphasis = node as Emphasis;
      const inner = emphasis.children
        .map((child) => convertPhrasing(child, options))
        .join("");
      return `\\textit{${inner}}`;
    }

    case "strong": {
      const strong = node as Strong;
      const inner = strong.children
        .map((child) => convertPhrasing(child, options))
        .join("");
      return `\\textbf{${inner}}`;
    }

    case "delete": {
      const del = node as Delete;
      const inner = del.children
        .map((child) => convertPhrasing(child, options))
        .join("");
      return `\\sout{${inner}}`;
    }

    case "inlineCode": {
      const inline = node as InlineCode;
      const escaped = maybeEscape(inline.value, options.escapeLatex).replaceAll(
        " ",
        "~",
      );
      return `\\texttt{${escaped}}`;
    }

    case "link": {
      const link = node as Link;
      const label = link.children
        .map((child) => convertPhrasing(child, options))
        .join("");
      const href = maybeEscape(link.url, true);
      return `\\href{${href}}{${label || href}}`;
    }

    case "image": {
      const image = node as Image;
      const alt = maybeEscape(image.alt || "Image", options.escapeLatex);
      const src = maybeEscape(image.url, true);
      return `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.9\\linewidth]{${src}}\n\\caption{${alt}}\n\\end{figure}`;
    }

    case "break":
      return "\\\\\n";

    default:
      return "";
  }
}

function paragraphToLatex(
  node: Paragraph,
  options: Required<ConvertOptions>,
  inList: boolean,
): string {
  const rawParagraph = toString(node);

  if (!inList && rawParagraph.startsWith(verseMarker)) {
    const verse = rawParagraph
      .slice(verseMarker.length)
      .split(verseBreakMarker)
      .map((line) => maybeEscape(line, options.escapeLatex))
      .join("\n")
      .replace(/\.{3,}/g, (dots) => `${dotRunMarker}${dots.length}END`);
    return wrapVerse(verse);
  }

  if (!inList && rawParagraph.startsWith(attributionMarker)) {
    const attribution = maybeEscape(
      rawParagraph.slice(attributionMarker.length),
      options.escapeLatex,
    );
    return `\\textit{${attribution}}.`;
  }

  if (options.poetryMode && !inList) {
    const lines = rawParagraph
      .split(/\r?\n/g)
      .map((line) => maybeEscape(line.trimEnd(), options.escapeLatex));

    return lines.map((line) => `${line}\\\\`).join("\n");
  }

  const paragraph = node.children
    .map((child) => convertPhrasing(child, options))
    .join("");

  if (!inList && /^(?:[A-Z]|[IVXLCDM]+)\.\s+\S/.test(rawParagraph)) {
    return `\\noindent\\textbf{${paragraph}}`;
  }

  return paragraph;
}

function tableCellToLatex(
  cell: TableCell,
  options: Required<ConvertOptions>,
): string {
  const content = cell.children
    .map((node) => convertPhrasing(node, options))
    .join("")
    .trim();

  return content;
}

function tableRowToLatex(
  row: TableRow,
  options: Required<ConvertOptions>,
  addHline: boolean,
): string {
  const cells = row.children.map((cell) => tableCellToLatex(cell, options));
  const body = `${cells.join(" & ")} \\\\`;

  if (!addHline) {
    return body;
  }

  return `${body}\n\\hline`;
}

function tableToLatex(table: Table, options: Required<ConvertOptions>): string {
  const columnCount = table.children[0]?.children.length || 1;
  const columns = new Array(columnCount).fill("l").join(" | ");
  const header = table.children[0]
    ? tableRowToLatex(table.children[0], options, true)
    : "";
  const bodyRows = table.children
    .slice(1)
    .map((row) => tableRowToLatex(row, options, false))
    .join("\n");

  const lines = [
    `\\begin{tabular}{| ${columns} |}`,
    "\\hline",
    header,
    bodyRows,
    "\\hline",
    "\\end{tabular}",
  ].filter(Boolean);

  return lines.join("\n");
}

function listItemToLatex(
  node: ListItem,
  options: Required<ConvertOptions>,
  depth: number,
  alphabetic: boolean,
): string {
  const parts = node.children
    .map((child) =>
      child.type === "list"
        ? listToLatex(child as List, options, depth + 1)
        : convertBlock(child, options, true),
    )
    .filter(Boolean)
    .join("\n\n");
  const content = alphabetic
    ? parts.replace(alphabeticListMarker, "")
    : parts;
  const indentation = "    ".repeat(depth + 1);

  return `${indentation}\\item ${content}`.trimEnd();
}

function listToLatex(
  node: List,
  options: Required<ConvertOptions>,
  depth = 0,
): string {
  const environment = node.ordered ? "enumerate" : "itemize";
  const alphabetic = node.children.every((item) =>
    toString(item).startsWith(alphabeticListMarker),
  );
  const indentation = "    ".repeat(depth);
  const opening = alphabetic
    ? `\\begin{${environment}}[label=\\alph*.]`
    : `\\begin{${environment}}`;
  const renderedItems = node.children.map((item) =>
    listItemToLatex(item, options, depth, alphabetic),
  );
  const items = renderedItems
    .map((item, index) => {
      const previousItem = renderedItems[index - 1];
      const separator =
        node.spread || depth > 0 || previousItem?.includes("\n") ? "\n\n" : "\n";
      return index === 0 ? item : `${separator}${item}`;
    })
    .join("");

  return `${indentation}${opening}\n${items}\n${indentation}\\end{${environment}}`;
}

function headingToLatex(
  node: Heading,
  options: Required<ConvertOptions>,
  chapterNumber?: number,
): string {
  const content = node.children
    .map((child) => convertPhrasing(child, options))
    .join("");

  if (node.depth === 1 && chapterNumber !== undefined) {
    const pageBreak = chapterNumber > 1 ? "\\newpage\n" : "";
    return `${pageBreak}\\newpage\n\\refstepcounter{chapter}\\label{pt:${chapterNumber}}\n\\centerpart{${content}}{}`;
  }

  const command = headingCommands[Math.min(Math.max(node.depth - 2, 0), 4)];
  return `\\${command}{${content}}`;
}

function codeToLatex(node: Code): string {
  const codeBody = node.value || "";

  return `\\begin{verbatim}\n${codeBody}\n\\end{verbatim}`;
}

function blockquoteToLatex(
  node: Blockquote,
  options: Required<ConvertOptions>,
): string {
  const body = node.children
    .map((child) => convertBlock(child, options, false))
    .filter(Boolean)
    .join("\n");

  return `\\begin{quote}\n${body}\n\\end{quote}`;
}

function convertBlock(
  node: Content,
  options: Required<ConvertOptions>,
  inList: boolean,
): string {
  switch (node.type) {
    case "heading":
      return headingToLatex(node as Heading, options);

    case "paragraph": {
      const paragraph = paragraphToLatex(node as Paragraph, options, inList);
      if (options.poetryMode && !inList) {
        return wrapVerse(paragraph);
      }
      return paragraph;
    }

    case "list":
      return listToLatex(node as List, options);

    case "blockquote":
      return blockquoteToLatex(node as Blockquote, options);

    case "code":
      return codeToLatex(node as Code);

    case "thematicBreak":
      return "\\begin{center}\n***\n\\end{center}";

    case "table":
      return tableToLatex(node as Table, options);

    default:
      return "";
  }
}

function wrapVerse(content: string): string {
  return `\\begin{verse}\n${content}\n\\end{verse}`;
}

function applyLatexHeuristics(value: string): string {
  return value
    .replace(/(?:\.|…){3,}/g, "\\dots")
    .replace(/---/g, "---")
    .replace(/,,/g, "„")
    .replace(/²/g, "\\textsuperscript{2}")
    .replace(/([A-Za-z])2\b/g, "$1\\textsuperscript{2}")
    .replace(new RegExp(`${dotRunMarker}(\\d+)END`, "g"), (_, length: string) =>
      ".".repeat(Number(length)),
    );
}

export function extractLatexToc(markdown: string): string {
  const ast = markdownParser.parse(markdown) as Root;

  return ast.children
    .filter((node): node is Heading => node.type === "heading" && node.depth === 1)
    .map((heading, index) => {
      const number = index + 1;
      const title = toString(heading);
      const escapedTitle = escapeLatexText(title);
      return `\\item \\hyperref[pt:${number}]{\\textbf{\\small ${escapedTitle}}} \\dotfill \\pageref{pt:${number}}`;
    })
    .join("\n");
}

export function markdownToLatex(
  markdown: string,
  options: ConvertOptions = {},
): string {
  const settings: Required<ConvertOptions> = {
    poetryMode: options.poetryMode ?? false,
    escapeLatex: options.escapeLatex ?? true,
  };

  const protectedInput = protectLatexFragments(markdown);
  const normalizedLists = normalizePlainTextLists(protectedInput.markdown);
  const ast = markdownParser.parse(
    normalizeParagraphSpacing(normalizedLists, settings.poetryMode),
  ) as Root;

  let chapterNumber = 0;
  const blocks = ast.children
    .map((node) => {
      if (node.type === "heading" && node.depth === 1) {
        chapterNumber += 1;
        return headingToLatex(node, settings, chapterNumber);
      }

      return convertBlock(node, settings, false);
    })
    .filter((node) => node.trim().length > 0);

  const body = blocks.join("\n\n").trim();

  if (!body) {
    return "";
  }

  return applyLatexHeuristics(body).replace(
    new RegExp(`${latexFragmentMarker}(\\d+)END`, "g"),
    (_, index: string) => protectedInput.fragments[Number(index)],
  );
}
