import React from 'react';
import { BIBLE_BOOKS } from '@/lib/bibleData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Navigation button component
function NavBtn({ onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="h-11 min-w-11 px-3 py-2 text-base text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors font-mono leading-none"
    >
      {children}
    </button>
  );
}

export default function ScriptureSelector({ book, chapter, onSelect }) {
  const bookIndex = BIBLE_BOOKS.findIndex(b => b.name === book);
  const selectedBookData = BIBLE_BOOKS[bookIndex];
  const chapterCount = selectedBookData?.chapters || 1;
  const chapterNumbers = Array.from({ length: chapterCount }, (_, i) => i + 1);

  const prevChapter = () => {
    if (chapter > 1) { onSelect(book, chapter - 1, 1); return; }
    if (bookIndex > 0) {
      const prevBook = BIBLE_BOOKS[bookIndex - 1];
      onSelect(prevBook.name, prevBook.chapters, 1);
    }
  };

  const nextChapter = () => {
    if (chapter < chapterCount) { onSelect(book, chapter + 1, 1); return; }
    if (bookIndex < BIBLE_BOOKS.length - 1) {
      onSelect(BIBLE_BOOKS[bookIndex + 1].name, 1, 1);
    }
  };

  const prevBook = () => {
    if (bookIndex > 0) onSelect(BIBLE_BOOKS[bookIndex - 1].name, 1, 1);
  };

  const nextBook = () => {
    if (bookIndex < BIBLE_BOOKS.length - 1) onSelect(BIBLE_BOOKS[bookIndex + 1].name, 1, 1);
  };

  return (
    <div className="flex flex-col gap-3">

      {/* Selectors */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={book} onValueChange={(val) => onSelect(val, 1, 1)}>
          <SelectTrigger className="flex-1 bg-card border-border">
            <SelectValue placeholder="Book" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {BIBLE_BOOKS.map(b => (
              <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(chapter)} onValueChange={(val) => onSelect(book, Number(val), 1)}>
          <SelectTrigger className="w-full sm:w-28 bg-card border-border">
            <SelectValue placeholder="Ch" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {chapterNumbers.map(n => (
              <SelectItem key={n} value={String(n)}>Ch. {n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

      </div>

      {/* Navigation arrows */}
      <div className="flex items-center gap-0.5">
        <NavBtn onClick={prevBook} title="Previous book">«</NavBtn>
        <NavBtn onClick={prevChapter} title="Previous chapter">‹‹</NavBtn>
        <span className="flex-1 text-center font-heading text-2xl font-semibold">
          {book} {chapter}
        </span>
        <NavBtn onClick={nextChapter} title="Next chapter">››</NavBtn>
        <NavBtn onClick={nextBook} title="Next book">»</NavBtn>
      </div>
    </div>
  );
}