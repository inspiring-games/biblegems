import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Heart, UserPlus, UserCheck, EyeOff, Flag, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatReference } from '@/lib/bibleData';
import moment from 'moment';

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
  onProfileClick,
  showReference
}) {
  const [expanded, setExpanded] = useState(false);
  const isLiked = gem.liked_by?.includes(currentUserId);
  const needsExpand = gem.content?.length > 300;
  const initials = (gem.user_nickname || 'U').slice(0, 2).toUpperCase();

  return (
    <div className={`group rounded-xl border bg-card p-4 sm:p-5 transition-all duration-200 ${isOwn ? 'border-primary/30 shadow-sm ring-1 ring-primary/10' : 'border-border hover:shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => onProfileClick?.(gem.user_id)} className="shrink-0">
            <Avatar className="w-9 h-9">
              <AvatarImage src={gem.user_avatar} />
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
              {gem.user_nickname || 'Anonymous'}
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {gem.created_date && <span>{moment(gem.created_date).fromNow()}</span>}
              {showReference && (
                <span className="text-primary/70 font-medium">
                  {formatReference(gem.book, gem.chapter, gem.verse)}
                </span>
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

      {/* Content */}
      <div className={`mt-3 text-sm leading-relaxed text-foreground/90 ${!expanded && needsExpand ? 'max-h-28 overflow-hidden relative' : ''}`}>
        <ReactMarkdown className="prose prose-sm prose-stone max-w-none">
          {gem.content}
        </ReactMarkdown>
        {!expanded && needsExpand && (
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent" />
        )}
      </div>
      {needsExpand && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary font-heading font-medium mt-2 hover:text-primary/80 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Like count always visible; button only if handler provided */}
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
            <Button variant="ghost" size="sm" onClick={() => onEdit(gem)} className="h-8 px-2 text-muted-foreground">
              <Pencil className="w-3.5 h-3.5" />
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