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

test("converts uppercase Roman numeral headings into chapter parts", () => {
  const input = `I. ARTI DAN GUNA PELADJARAN SEDJARAH

Isi pertama dengan kedjadian².

II. PERGERAKAN SEDUNIA.

Isi kedua.

I. Politik :

1. Program pertama.`;

  const output = markdownToLatex(input);

  assert.match(
    output,
    /^\\refstepcounter\{chapter\}\\label\{pt:1\}\n\\centerpart\{ARTI DAN GUNA PELADJARAN SEDJARAH\}\{\}/,
  );
  assert.match(
    output,
    /\\newpage\n\\refstepcounter\{chapter\}\\label\{pt:2\}\n\\centerpart\{PERGERAKAN SEDUNIA\}\{\}/,
  );
  assert.match(output, /\\noindent\\textbf\{I\. Politik :\}/);
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
  const input = `I. ARTI DAN GUNA PELADJARAN SEDJARAH
I. Politik :
II. PERGERAKAN SEDUNIA.
XIV. PENUTUP`;

  assert.equal(
    extractLatexToc(input),
    `\\item \\hyperref[pt:1]{\\textbf{\\small ARTI DAN GUNA PELADJARAN SEDJARAH}} \\dotfill \\pageref{pt:1}
\\item \\hyperref[pt:2]{\\textbf{\\small PERGERAKAN SEDUNIA}} \\dotfill \\pageref{pt:2}
\\item \\hyperref[pt:14]{\\textbf{\\small PENUTUP}} \\dotfill \\pageref{pt:14}`,
  );
});
