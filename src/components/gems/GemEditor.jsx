import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Trash2 } from 'lucide-react';
import { formatReference } from '@/lib/bibleData';

export default function GemEditor({ book, chapter, verse, existingGem, onSave, onCancel, onDelete, saving, deleting }) {
  const [content, setContent] = useState(existingGem?.content || '');
  const ref = formatReference(book, chapter, verse);
  const isEdit = !!existingGem;

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-heading font-medium text-foreground">
            {isEdit ? 'Edit your gem' : 'Share a gem'} for {ref}
          </span>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share your reflection on this verse… (Markdown supported)"
        className="min-h-[100px] bg-background border-border resize-none text-sm"
        maxLength={5000}
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-muted-foreground">{content.length}/5000</span>
        <div className="flex items-center gap-2">
          {isEdit && onDelete && (
            <Button
              onClick={onDelete}
              disabled={deleting || saving}
              size="sm"
              variant="destructive"
              className="font-heading gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          )}
          <Button
            onClick={() => onSave(content)}
            disabled={!content.trim() || saving}
            size="sm"
            className="font-heading"
          >
            {saving ? 'Saving…' : isEdit ? 'Update Gem' : 'Share Gem'}
          </Button>
        </div>
      </div>
    </div>
  );
}