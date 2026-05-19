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

const markdownParser = unified().use(remarkParse).use(remarkGfm);

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
  if (options.poetryMode && !inList) {
    const lines = toString(node)
      .split(/\r?\n/g)
      .map((line) => maybeEscape(line.trimEnd(), options.escapeLatex));

    return lines.map((line) => `${line}\\\\`).join("\n");
  }

  return node.children.map((child) => convertPhrasing(child, options)).join("");
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
): string {
  const parts = node.children
    .map((child) => convertBlock(child, options, true))
    .filter(Boolean)
    .join("\n");

  return `\\item ${parts}`.trimEnd();
}

function listToLatex(node: List, options: Required<ConvertOptions>): string {
  const environment = node.ordered ? "enumerate" : "itemize";
  const items = node.children
    .map((item) => listItemToLatex(item, options))
    .join("\n");

  return `\\begin{${environment}}\n${items}\n\\end{${environment}}`;
}

function headingToLatex(
  node: Heading,
  options: Required<ConvertOptions>,
): string {
  const command = headingCommands[Math.min(node.depth, 5) - 1] || "paragraph";
  const content = node.children
    .map((child) => convertPhrasing(child, options))
    .join("");

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
      return "\\hrulefill";

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
    .replace(/([A-Za-z])2\b/g, "$1\\textsuperscript{2}");
}

export function markdownToLatex(
  markdown: string,
  options: ConvertOptions = {},
): string {
  const settings: Required<ConvertOptions> = {
    poetryMode: options.poetryMode ?? false,
    escapeLatex: options.escapeLatex ?? true,
  };

  const ast = markdownParser.parse(markdown) as Root;

  const blocks = ast.children
    .map((node) => convertBlock(node, settings, false))
    .filter((node) => node.trim().length > 0);

  const body = blocks.join("\n\n").trim();

  if (!body) {
    return "";
  }

  return applyLatexHeuristics(body);
}
