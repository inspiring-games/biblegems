export const BIBLE_BOOKS = [
  { name: "Genesis", chapters: 50 },
  { name: "Exodus", chapters: 40 },
  { name: "Leviticus", chapters: 27 },
  { name: "Numbers", chapters: 36 },
  { name: "Deuteronomy", chapters: 34 },
  { name: "Joshua", chapters: 24 },
  { name: "Judges", chapters: 21 },
  { name: "Ruth", chapters: 4 },
  { name: "1 Samuel", chapters: 31 },
  { name: "2 Samuel", chapters: 24 },
  { name: "1 Kings", chapters: 22 },
  { name: "2 Kings", chapters: 25 },
  { name: "1 Chronicles", chapters: 29 },
  { name: "2 Chronicles", chapters: 36 },
  { name: "Ezra", chapters: 10 },
  { name: "Nehemiah", chapters: 13 },
  { name: "Esther", chapters: 10 },
  { name: "Job", chapters: 42 },
  { name: "Psalms", chapters: 150 },
  { name: "Proverbs", chapters: 31 },
  { name: "Ecclesiastes", chapters: 12 },
  { name: "Song of Solomon", chapters: 8 },
  { name: "Isaiah", chapters: 66 },
  { name: "Jeremiah", chapters: 52 },
  { name: "Lamentations", chapters: 5 },
  { name: "Ezekiel", chapters: 48 },
  { name: "Daniel", chapters: 12 },
  { name: "Hosea", chapters: 14 },
  { name: "Joel", chapters: 3 },
  { name: "Amos", chapters: 9 },
  { name: "Obadiah", chapters: 1 },
  { name: "Jonah", chapters: 4 },
  { name: "Micah", chapters: 7 },
  { name: "Nahum", chapters: 3 },
  { name: "Habakkuk", chapters: 3 },
  { name: "Zephaniah", chapters: 3 },
  { name: "Haggai", chapters: 2 },
  { name: "Zechariah", chapters: 14 },
  { name: "Malachi", chapters: 4 },
  { name: "Matthew", chapters: 28 },
  { name: "Mark", chapters: 16 },
  { name: "Luke", chapters: 24 },
  { name: "John", chapters: 21 },
  { name: "Acts", chapters: 28 },
  { name: "Romans", chapters: 16 },
  { name: "1 Corinthians", chapters: 16 },
  { name: "2 Corinthians", chapters: 13 },
  { name: "Galatians", chapters: 6 },
  { name: "Ephesians", chapters: 6 },
  { name: "Philippians", chapters: 4 },
  { name: "Colossians", chapters: 4 },
  { name: "1 Thessalonians", chapters: 5 },
  { name: "2 Thessalonians", chapters: 3 },
  { name: "1 Timothy", chapters: 6 },
  { name: "2 Timothy", chapters: 4 },
  { name: "Titus", chapters: 3 },
  { name: "Philemon", chapters: 1 },
  { name: "Hebrews", chapters: 13 },
  { name: "James", chapters: 5 },
  { name: "1 Peter", chapters: 5 },
  { name: "2 Peter", chapters: 3 },
  { name: "1 John", chapters: 5 },
  { name: "2 John", chapters: 1 },
  { name: "3 John", chapters: 1 },
  { name: "Jude", chapters: 1 },
  { name: "Revelation", chapters: 22 }
];

export const BOOK_INDEX = {};
BIBLE_BOOKS.forEach((b, i) => { BOOK_INDEX[b.name] = i; });

export function getBookOrder(bookName) {
  return BOOK_INDEX[bookName] ?? 999;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractBibleReferences(content) {
  if (!content) return [];

  const bookNames = BIBLE_BOOKS
    .map((book) => book.name)
    .sort((a, b) => b.length - a.length);

  const referencePattern = new RegExp(
    `(?<![A-Za-z])(${bookNames.map(escapeRegExp).join('|')})\\s+(\\d{1,3})(?::(\\d{1,3})(?:-(\\d{1,3}))?)?`,
    'gi'
  );

  const references = [];
  const ignoredLeadingWords = new Set(['and', 'or', 'the', 'a', 'an', 'of', 'to', 'from', 'for', 'in', 'on', 'with', 'by', 'at', 'as', 'that', 'this']);

  for (const match of content.matchAll(referencePattern)) {
    const bookName = match[1]?.trim();
    const chapter = Number(match[2] || 1);
    const verse = Number(match[3] || 1);

    const matchedBook = BIBLE_BOOKS.find((book) => book.name.toLowerCase() === bookName.toLowerCase());
    if (!matchedBook) continue;

    const prefix = content.slice(0, match.index).trimEnd();
    const previousWord = prefix.split(/\s+/).pop()?.toLowerCase();
    if (previousWord && ignoredLeadingWords.has(previousWord)) continue;

    references.push({
      label: match[0].trim(),
      book: matchedBook.name,
      chapter,
      verse
    });
  }

  return references;
}

export function formatReference(book, chapter, verse) {
  return `${book} ${chapter}:${verse}`;
}