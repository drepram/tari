"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markdownToLatex } from "@/lib/markdown-to-latex";

const EXAMPLE_MARKDOWN = `# Nyanyian Senja

_Catatan kecil_ dari perjalanan yang panjang.

## Daftar bekal

1. Peta tua
2. Kompas
3. Surat dari rumah

> Angin membawa kabar, laut menyimpan jawab.

Baris ini memuat **teks tebal**, _miring_, dan [tautan](https://example.com).

---

| Kota | Tahun | Catatan |
| --- | --- | --- |
| Bandung | 1968 | Titik berangkat |
| Surabaya | 1972 | Titik pulang |
`;

export default function Home() {
  const [markdownInput, setMarkdownInput] = useState(EXAMPLE_MARKDOWN);
  const [latexOutput, setLatexOutput] = useState(() =>
    markdownToLatex(EXAMPLE_MARKDOWN, {
      poetryMode: false,
      escapeLatex: true,
    }),
  );
  const [escapeLatex, setEscapeLatex] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const copyResetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  const convertWith = useCallback(
    (input: string, shouldEscape: boolean) => {
      try {
        const converted = markdownToLatex(input, {
          poetryMode: false,
          escapeLatex: shouldEscape,
        });

        setLatexOutput(converted);
        setErrorMessage("");
      } catch {
        setErrorMessage("Could not parse markdown. Check your input syntax.");
      }
    },
    [],
  );

  function handleConvert() {
    convertWith(markdownInput, escapeLatex);
  }

  function handleLoadExample() {
    setMarkdownInput(EXAMPLE_MARKDOWN);
    convertWith(EXAMPLE_MARKDOWN, escapeLatex);
  }

  function handleClear() {
    setMarkdownInput("");
    setLatexOutput("");
    setErrorMessage("");
    setCopied(false);
  }

  async function handleCopy() {
    if (!latexOutput.trim()) {
      return;
    }

    await navigator.clipboard.writeText(latexOutput);
    setCopied(true);

    if (copyResetTimer.current !== null) {
      window.clearTimeout(copyResetTimer.current);
    }

    copyResetTimer.current = window.setTimeout(() => {
      setCopied(false);
      copyResetTimer.current = null;
    }, 1200);
  }

  function handleEscapeToggle(nextValue: boolean) {
    setEscapeLatex(nextValue);
    convertWith(markdownInput, nextValue);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f9ed_0%,_#d9ddc2_45%,_#c8cfb0_100%)] text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-10 md:py-12">
        <section className="rounded-2xl border border-zinc-900/10 bg-white/65 p-6 shadow-[0_12px_40px_rgba(36,40,22,0.09)] backdrop-blur">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                        <a
              href="https://www.monsoonbooks.co.uk/product/my-neighbour-the-dictator-by-tari-lang/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-zinc-900"
            >TARI</a> - La<span className="font-black">T</span>eX{" "}
            M<span className="font-black">ar</span>kdown{" "}
            <span className="font-black">I</span>nterpreter
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-700 md:text-lg">
            Convert Markdown into LaTeX syntax for common structures like
            <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-100">
              \textit
            </code>
            ,
            <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-100">
              \textbf
            </code>
            ,
            <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 text-sm text-zinc-100">
              \begin{"{"}enumerate{"}"}
            </code>
            , tables, blockquotes, and verse wrappers.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLoadExample}
              className="rounded-md border border-zinc-900/30 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition hover:border-zinc-900 hover:bg-zinc-50"
            >
              Load Example
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-zinc-900/20 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-900/40"
            >
              Clear
            </button>

            <label className="inline-flex items-center gap-2 rounded-md border border-zinc-900/20 bg-white px-3 py-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={escapeLatex}
                onChange={(event) => handleEscapeToggle(event.target.checked)}
                className="size-4 accent-zinc-900"
              />
              Escape symbols
            </label>
          </div>

          {errorMessage ? (
            <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-900/10 bg-white/65 p-4 shadow-[0_8px_24px_rgba(36,40,22,0.08)] backdrop-blur md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Input</h2>
              <button
                type="button"
                onClick={handleConvert}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-700"
              >
                Convert
              </button>
            </div>
            <textarea
              value={markdownInput}
              onChange={(event) => setMarkdownInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  handleConvert();
                }
              }}
              placeholder="Paste markdown content here..."
              className="min-h-[26rem] w-full resize-y rounded-lg border border-zinc-900/15 bg-[#f9faf3] p-4 font-mono text-sm leading-6 text-zinc-800 outline-none ring-0 transition placeholder:text-zinc-500 focus:border-zinc-900/40"
            />
          </article>

          <article className="rounded-2xl border border-zinc-900/10 bg-white/65 p-4 shadow-[0_8px_24px_rgba(36,40,22,0.08)] backdrop-blur md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Output</h2>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!latexOutput.trim()}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-50 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {copied ? "Copied" : "Copy Output"}
              </button>
            </div>
            <textarea
              readOnly
              value={latexOutput}
              placeholder="LaTeX output appears here..."
              className="min-h-[26rem] w-full resize-y rounded-lg border border-zinc-900/15 bg-zinc-950 p-4 font-mono text-sm leading-6 text-zinc-100 outline-none ring-0 placeholder:text-zinc-400"
            />
          </article>
        </section>

        <p className="text-sm text-zinc-700">
          Tip: press Cmd/Ctrl + Enter in the input editor to run conversion.
        </p>
      </main>
    </div>
  );
}
