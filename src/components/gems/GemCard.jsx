import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Heart, UserPlus, UserCheck, EyeOff, Flag, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatReference, extractBibleReferences } from '@/lib/bibleData';
import moment from 'moment';
import GemEditor from '@/components/gems/GemEditor';
import { base44 } from '@/api/base44Client';

export default function GemCard({
  gem,
  isOwn,
  isFollowing,
  currentUserId,
  onLike,
  onFollow,
  onHide,
  onReport,
  onEdit,
  onDelete,
  onProfileClick,
  onNavigateVerse,
  onTagSelect,
  showReference
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userDisplay, setUserDisplay] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchUserDisplay = async () => {
      try {
        const users = await base44.entities.User.filter({ user_id: gem.user_id });
        if (users.length > 0) {
          const user = users[0];
          setUserDisplay({
            name: user.full_name || user.nickname || gem.user_nickname || 'Anonymous',
            avatar: user.avatar || gem.user_avatar
          });
        } else {
          setUserDisplay({
            name: gem.user_nickname || 'Anonymous',
            avatar: gem.user_avatar
          });
        }
      } catch (error) {
        setUserDisplay({
          name: gem.user_nickname || 'Anonymous',
          avatar: gem.user_avatar
        });
      }
    };
    fetchUserDisplay();
  }, [gem.user_id, gem.user_nickname, gem.user_avatar]);

  const isLiked = gem.liked_by?.includes(currentUserId);
  const needsExpand = gem.content?.length > 300;
  const initials = (userDisplay?.name || 'U').slice(0, 2).toUpperCase();

  const linkedReferences = useMemo(() => {
    if (!gem.content) return [];
    return extractBibleReferences(gem.content);
  }, [gem.content]);

  const hashtags = useMemo(() => {
    if (!gem.content) return [];
    return Array.from(new Set(gem.content.matchAll(/#[A-Za-z0-9_/-]+/g))).map((match) => match[0]);
  }, [gem.content]);

  const handleDeleteConfirm = async () => {
    if (window.confirm('Are you sure you want to delete this gem?')) {
      setDeleting(true);
      try {
        await base44.entities.Gem.delete(gem.id);
        onDelete?.(gem);
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setDeleting(false);
      }
    }
  };

  if (editing) {
    return (
      <GemEditor
        book={gem.book}
        chapter={gem.chapter}
        verse={gem.verse}
        existingGem={gem}
        onSave={async (content) => {
          await onEdit?.(gem, content);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        saving={false}
        onDelete={handleDeleteConfirm}
        deleting={deleting}
      />
    );
  }

  return (
    <div className={`group rounded-xl border bg-card p-4 sm:p-5 transition-all duration-200 ${isOwn ? 'border-primary/30 shadow-sm ring-1 ring-primary/10' : 'border-border hover:shadow-sm'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => onProfileClick?.(gem.user_id)} className="shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarImage src={userDisplay?.avatar} />
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-heading font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0">
            <button
              onClick={() => onProfileClick?.(gem.user_id)}
              className="text-sm font-heading font-medium text-foreground truncate block hover:text-primary transition-colors"
            >
              {userDisplay?.name || 'Anonymous'}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {gem.created_date && <span>{moment(gem.created_date).fromNow()}</span>}
              {showReference && (
                <button
                  onClick={() => onNavigateVerse?.(gem.book, gem.chapter, gem.verse)}
                  className="text-primary/70 font-medium hover:text-primary transition-colors"
                >
                  {formatReference(gem.book, gem.chapter, gem.verse)}
                </button>
              )}
            </div>
          </div>
        </div>
        {isOwn && (
          <span className="text-[10px] uppercase tracking-wider font-heading font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            Your Gem
          </span>
        )}
      </div>

      <div className={`mt-3 text-sm leading-relaxed text-foreground/90 ${!expanded && needsExpand ? 'max-h-28 overflow-hidden relative' : ''}`}>
        <ReactMarkdown className="prose prose-sm prose-stone max-w-none">
          {gem.content}
        </ReactMarkdown>
        {!expanded && needsExpand && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {linkedReferences.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {linkedReferences.map((reference, index) => (
            <button
              key={`${reference.label}-${index}`}
              onClick={() => onNavigateVerse?.(reference.book, reference.chapter, reference.verse)}
              className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              {reference.label}
            </button>
          ))}
        </div>
      )}
      {hashtags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {hashtags.map((tag) => (
            <button
              key={tag}
              onClick={() => onTagSelect?.(tag)}
              className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary font-heading font-medium mt-2 hover:text-primary/80 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {onLike ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLike(gem)}
              className={`h-8 px-2 gap-1.5 text-xs ${isLiked ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-primary' : ''}`} />
              {gem.likes_count || 0}
            </Button>
          ) : (
            <span className="flex items-center gap-1.5 h-8 px-2 text-xs text-muted-foreground">
              <Heart className="w-3.5 h-3.5" />{gem.likes_count || 0}
            </span>
          )}

          {!isOwn && onFollow && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFollow(gem.user_id)}
              className="h-8 px-2 gap-1.5 text-xs text-muted-foreground"
            >
              {isFollowing ? (
                <><UserCheck className="w-3.5 h-3.5 text-primary" /> Following</>
              ) : (
                <><UserPlus className="w-3.5 h-3.5" /> Follow</>
              )}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {isOwn && onEdit && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-8 px-2 text-muted-foreground">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {isOwn && onDelete && (
            <Button variant="ghost" size="sm" onClick={handleDeleteConfirm} disabled={deleting} className="h-8 px-2 text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {!isOwn && onHide && (
            <Button variant="ghost" size="sm" onClick={() => onHide(gem)} className="h-8 px-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <EyeOff className="w-3.5 h-3.5" />
            </Button>
          )}
          {!isOwn && onReport && (
            <Button variant="ghost" size="sm" onClick={() => onReport(gem)} className="h-8 px-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <Flag className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}