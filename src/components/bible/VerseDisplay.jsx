import React from 'react';
import { formatReference } from '@/lib/bibleData';
import { Sparkles } from 'lucide-react';

export default function VerseDisplay({ book, chapter, verse, text, translation }) {
  const ref = formatReference(book, chapter, verse);

  return (
    <div className="relative py-8 px-6 sm:px-10 bg-card rounded-xl border border-border shadow-sm">
      <div className="absolute top-4 left-6 sm:left-10">
        <Sparkles className="w-4 h-4 text-primary/40" />
      </div>
      <div className="text-center space-y-4">
        <p className="font-display text-xl sm:text-2xl md:text-3xl leading-relaxed text-foreground italic">
          {text || "Select a verse to begin your reflection…"}
        </p>
        {text && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="h-px w-8 bg-primary/20" />
            <p className="text-sm font-heading font-medium text-primary tracking-wide">
              {ref}
            </p>
            {translation && (
              <span className="text-xs text-muted-foreground font-heading">
                ({translation})
              </span>
            )}
            <div className="h-px w-8 bg-primary/20" />
          </div>
        )}
      </div>
    </div>
  );
}