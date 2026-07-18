import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBibleReferences } from '../src/lib/bibleData.js';

test('extracts scripture references from simple text', () => {
  const text = 'John 3:16 is loved by many people.';

  assert.deepEqual(extractBibleReferences(text), [
    { label: 'John 3:16', book: 'John', chapter: 3, verse: 16 }
  ]);
});

test('does not treat a preceding conjunction as a standalone reference', () => {
  const text = 'He said, and Mark 14:58 was quoted.';

  assert.deepEqual(extractBibleReferences(text), []);
});

test('handles multi-word book names', () => {
  const text = 'Song of Solomon 2:15 speaks of love.';

  assert.deepEqual(extractBibleReferences(text), [
    { label: 'Song of Solomon 2:15', book: 'Song of Solomon', chapter: 2, verse: 15 }
  ]);
});
