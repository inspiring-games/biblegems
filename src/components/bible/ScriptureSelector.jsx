import React from 'react';
import { BIBLE_BOOKS } from '@/lib/bibleData';

const BOOK_ABBREVIATIONS = {
  Genesis: 'Gen',
  Exodus: 'Exo',
  Leviticus: 'Lev',
  Numbers: 'Num',
  Deuteronomy: 'Deut',
  Joshua: 'Josh',
  Judges: 'Judg',
  Ruth: 'Ruth',
  '1 Samuel': '1 Sam',
  '2 Samuel': '2 Sam',
  '1 Kings': '1 Kgs',
  '2 Kings': '2 Kgs',
  '1 Chronicles': '1 Chr',
  '2 Chronicles': '2 Chr',
  Ezra: 'Ezra',
  Nehemiah: 'Neh',
  Esther: 'Esth',
  Job: 'Job',
  Psalms: 'Ps',
  Proverbs: 'Prov',
  Ecclesiastes: 'Eccl',
  'Song of Solomon': 'Song',
  Isaiah: 'Isa',
  Jeremiah: 'Jer',
  Lamentations: 'Lam',
  Ezekiel: 'Ezek',
  Daniel: 'Dan',
  Hosea: 'Hos',
  Joel: 'Joel',
  Amos: 'Amos',
  Obadiah: 'Obad',
  Jonah: 'Jon',
  Micah: 'Mic',
  Nahum: 'Nah',
  Habakkuk: 'Hab',
  Zephaniah: 'Zeph',
  Haggai: 'Hag',
  Zechariah: 'Zech',
  Malachi: 'Mal',
  Matthew: 'Matt',
  Mark: 'Mark',
  Luke: 'Luke',
  John: 'John',
  Acts: 'Acts',
  Romans: 'Rom',
  '1 Corinthians': '1 Cor',
  '2 Corinthians': '2 Cor',
  Galatians: 'Gal',
  Ephesians: 'Eph',
  Philippians: 'Phil',
  Colossians: 'Col',
  '1 Thessalonians': '1 Thes',
  '2 Thessalonians': '2 Thes',
  '1 Timothy': '1 Tim',
  '2 Timothy': '2 Tim',
  Titus: 'Titus',
  Philemon: 'Phlm',
  Hebrews: 'Heb',
  James: 'Jas',
  '1 Peter': '1 Pet',
  '2 Peter': '2 Pet',
  '1 John': '1 John',
  '2 John': '2 John',
  '3 John': '3 John',
  Jude: 'Jude',
  Revelation: 'Rev'
};

function getBookTone(entry, index) {
  const name = entry.name;
  const pentateuch = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];
  const poetic = ['Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon'];
  const gospelsActs = ['Matthew', 'Mark', 'Luke', 'John', 'Acts'];
  const catholic = ['James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'];

  const isOldTestament = index < 39;
  const isNewTestament = !isOldTestament;

  if (isOldTestament) {
    if (pentateuch.includes(name) || poetic.includes(name)) {
      return 'border-sky-600/40 bg-sky-700/20 text-sky-800 hover:bg-sky-700/30 dark:text-sky-200';
    }
    return 'border-sky-400/40 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300';
  }

  if (gospelsActs.includes(name) || catholic.includes(name)) {
    return 'border-emerald-600/40 bg-emerald-700/20 text-emerald-800 hover:bg-emerald-700/30 dark:text-emerald-200';
  }

  return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300';
}

export default function ScriptureSelector({ book, chapter, onSelect }) {
  const bookIndex = BIBLE_BOOKS.findIndex((entry) => entry.name === book);
  const selectedBook = BIBLE_BOOKS[bookIndex] || BIBLE_BOOKS[0];
  const chapterCount = selectedBook?.chapters || 1;
  const chapterNumbers = Array.from({ length: chapterCount }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-6 gap-2 md:grid-cols-11">
        {BIBLE_BOOKS.map((entry, index) => {
          const active = entry.name === book;
          const tone = getBookTone(entry, index);
          return (
            <button
              key={entry.name}
              type="button"
              onClick={() => onSelect(entry.name, 1, 1)}
              className={`rounded-xl border px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wide transition-all ${tone} ${active ? 'ring-2 ring-offset-2 ring-offset-background ring-primary/60' : ''}`}
            >
              <div className="truncate">{BOOK_ABBREVIATIONS[entry.name] || entry.name.slice(0, 4)}</div>
            </button>
          );
        })}
      </div>

      <div className={`rounded-2xl border border-border/70 p-3 ${bookIndex < 39 ? 'bg-sky-500/10' : 'bg-emerald-500/10'}`}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{selectedBook.name}</p>
            <p className="text-xs text-muted-foreground">{chapterCount} chapters</p>
          </div>
          <p className="text-xs font-medium text-muted-foreground">{book} {chapter}</p>
        </div>

        <div className="grid grid-cols-10 gap-2">
          {chapterNumbers.map((chapterNumber) => {
            const active = chapterNumber === chapter;
            return (
              <button
                key={chapterNumber}
                type="button"
                onClick={() => onSelect(selectedBook.name, chapterNumber, 1)}
                className={`rounded-lg border px-2 py-2 text-sm font-medium transition-all ${active ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border/70 bg-background/70 text-foreground hover:bg-accent'}`}
              >
                {chapterNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}