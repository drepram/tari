import assert from "node:assert/strict";
import test from "node:test";
import { extractLatexToc, markdownToLatex } from "./markdown-to-latex.ts";

test("converts an inline alphabetic list", () => {
  const input = "Menurut statutennja Budi Utomo bermaksud untuk berusaha sekedar tenaga dengan menempuh djalan² jang sah supaja bangsa dan nusa Djawa dan Madura mendapat kemadjuan jang harmonis dan memberikan bantuan kepada orang² jang mempunjai tudjuan jang scrupa dengan ini. Terutama akan diperhatikan: a. kepentingan pengadjaran pada umumnja. b. memadjukan pertanian, peternakan dan perdagangan. c. memadjukan téknik dan industri. d. menghidupkan kembali kebudajaan dan ilmu jang lama. e. mempertinggi tjita² kemanusiaan pada umumnja. f. segala jang perlu untuk mendjamin kehidupan sebagai bangsa jang terhormat. Daftar usaha ini memperlihatkan bahwa perhatian terutama ditudjukan kepada soal² kultureel dan sosial. Disini belum terdapat satu politik program.";

  const expected = `Menurut statutennja Budi Utomo bermaksud untuk berusaha sekedar tenaga dengan menempuh djalan\\textsuperscript{2} jang sah supaja bangsa dan nusa Djawa dan Madura mendapat kemadjuan jang harmonis dan memberikan bantuan kepada orang\\textsuperscript{2} jang mempunjai tudjuan jang scrupa dengan ini. Terutama akan diperhatikan:

\\begin{enumerate}[label=\\alph*.]
    \\item kepentingan pengadjaran pada umumnja.
    \\item memadjukan pertanian, peternakan dan perdagangan.
    \\item memadjukan téknik dan industri.
    \\item menghidupkan kembali kebudajaan dan ilmu jang lama.
    \\item mempertinggi tjita\\textsuperscript{2} kemanusiaan pada umumnja.
    \\item segala jang perlu untuk mendjamin kehidupan sebagai bangsa jang terhormat.
\\end{enumerate}

Daftar usaha ini memperlihatkan bahwa perhatian terutama ditudjukan kepada soal\\textsuperscript{2} kultureel dan sosial. Disini belum terdapat satu politik program.`;

  assert.equal(markdownToLatex(input), expected);
});

test("converts lettered sections with nested lists", () => {
  const input = `A. Bentuk dan Susunan Parlemén.

1. Parlemén jang dimaksudkan oléh Gapi terdiri atas dua Kamar jaitu Kamar Pertama dan Kamar Kedua.
2. Semua anggota dipilih.
3. Hak memilih ialah umum dan langsung.
4. Banjaknja anggota Kamar Pertama dan Kamar Kedua ialah se-kurang²nja 100 dan 200 masing².
5. Parlemén adalah suatu badan jang tertinggi untuk membuat undang² dalam negara.

C. Daja upaja untuk mentjapai „Indonésia Berparlemén”.

1. Langkah² pertama jang harus dilakukan oléh Pemerintah Belanda ialah.

a. pengangkatan seorang Indonésia mendjadi wakil Gubernur Djéndral G.G.).
b. pengangkatan seorang Indonésia mendjadi wakil Diréktur untuk tiap² departemén.
c. pengangkatan lebih banjak lagi orang Indonésia mendjadi anggota Déwan Hindia (Raad van Indie).

2. Pemerintah dan Badan Perwakilan merupakan ber-sama² „Self-Government” Indonésia.`;

  const output = markdownToLatex(input);

  assert.match(output, /^\\noindent\\textbf\{A\. Bentuk dan Susunan Parlemén\.\}/);
  assert.match(output, /\\begin\{enumerate\}\n    \\item Parlemén/);
  assert.match(output, /se-kurang\\textsuperscript\{2\}nja/);
  assert.match(output, /\\noindent\\textbf\{C\. Daja upaja/);
  assert.match(output, /    \\begin\{enumerate\}\[label=\\alph\*\.\]/);
  assert.match(output, /        \\item pengangkatan seorang Indonésia/);
  assert.match(output, /    \\end\{enumerate\}/);
  assert.match(
    output,
    /    \\end\{enumerate\}\n\n    \\item Pemerintah dan Badan Perwakilan/,
  );
});

test("converts level-one Markdown headings into chapter parts", () => {
  const input = `# pertama

Isi pertama dengan kedjadian².

# bagian 2

Isi kedua.

## Politik

1. Program pertama.`;

  const output = markdownToLatex(input);

  assert.match(
    output,
    /^\\refstepcounter\{chapter\}\\label\{pt:1\}\n\\centerpart\{pertama\}\{\}/,
  );
  assert.match(
    output,
    /\\newpage\n\\refstepcounter\{chapter\}\\label\{pt:2\}\n\\centerpart\{bagian 2\}\{\}/,
  );
  assert.match(output, /\\section\{Politik\}/);
});

test("converts a stanza and its attribution", () => {
  const input = `VI. PARTAI KOMUNIS INDONESIA (P.K.I.)

Bangunlah kaum jang terhina,
Bangunlah kaum jang lapar!
Kehendak jang mulia dalam dunia
Senantiasa bertambah besar
....................................
(Internationale).`;

  const output = markdownToLatex(input);

  assert.match(
    output,
    /\\begin\{verse\}\nBangunlah kaum jang terhina,\nBangunlah kaum jang lapar![\s\S]*\.{36}\n\\end\{verse\}/,
  );
  assert.match(output, /\\textit\{\(Internationale\)\}\./);
});

test("extracts a linked table of contents from chapter headings", () => {
  const input = `# pertama
## Politik
# bagian 2
# PENUTUP`;

  assert.equal(
    extractLatexToc(input),
    `\\item \\hyperref[pt:1]{\\textbf{\\small pertama}} \\dotfill \\pageref{pt:1}
\\item \\hyperref[pt:2]{\\textbf{\\small bagian 2}} \\dotfill \\pageref{pt:2}
\\item \\hyperref[pt:3]{\\textbf{\\small PENUTUP}} \\dotfill \\pageref{pt:3}`,
  );
});

test("does not infer chapters from unmarked Roman numeral text", () => {
  const input = `I. pertama

REVOLUSI Perantjis !

# kedua`;

  assert.equal(
    extractLatexToc(input),
    "\\item \\hyperref[pt:1]{\\textbf{\\small kedua}} \\dotfill \\pageref{pt:1}",
  );
});

test("preserves existing LaTeX footnotes", () => {
  const input = `Ia membeli perusahaan pakaian dekat gapura Kemenangan\\footnote{Perkampungan orang miskin.}; perusahaan itu tetap berjalan.

Mereka tinggal di Djalan Oruzheiny\\footnote{Djalan Oruzheiny: Djalan Meriam atau \\textit{Djalan Persendjataan}.}, dimana kamar-kamar telah dipesan dengan biaya 50%.`;

  assert.equal(
    markdownToLatex(input),
    `Ia membeli perusahaan pakaian dekat gapura Kemenangan\\footnote{Perkampungan orang miskin.}; perusahaan itu tetap berjalan.

Mereka tinggal di Djalan Oruzheiny\\footnote{Djalan Oruzheiny: Djalan Meriam atau \\textit{Djalan Persendjataan}.}, dimana kamar-kamar telah dipesan dengan biaya 50\\%.`,
  );

  assert.equal(
    markdownToLatex(String.raw`Kemenangan\\footnote{Perkampungan orang miskin.}`),
    String.raw`Kemenangan\footnote{Perkampungan orang miskin.}`,
  );
});

test("preserves existing LaTeX center commands", () => {
  const input = String.raw`Sebelum \begin{center}teks 50%\end{center} sesudah.`;

  assert.equal(
    markdownToLatex(input),
    String.raw`Sebelum \begin{center}teks 50%\end{center} sesudah.`,
  );

  const doubled = String.raw`\\begin{center}Tengah\\end{center}`;
  assert.equal(
    markdownToLatex(doubled),
    String.raw`\begin{center}Tengah\end{center}`,
  );
});

test("preserves nested LaTeX commands inside a center environment", () => {
  const input = String.raw`\begin{center}
\textbf{\textit{2}}
\end{center}`;

  assert.equal(markdownToLatex(input), input);
});

test("preserves existing LaTeX verse environments", () => {
  const input = String.raw`Sebelum.

\begin{verse}
Bebanmu akan berat\\
Djiwamu harus kuat\\
tapi aku pertjaja\\
langkahmu akan djaja\\
kuatkan Pribadimu
\end{verse}

Sesudah 50%.`;

  assert.equal(
    markdownToLatex(input),
    `${input.slice(0, input.lastIndexOf("50%"))}50\\%.`,
  );
});
