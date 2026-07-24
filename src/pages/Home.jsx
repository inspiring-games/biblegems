import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate, Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { tables } from '@/api/supabaseClient';
import { insertReport } from '@/api/reporting';
import ScriptureSelector from '@/components/bible/ScriptureSelector';
import SearchBar from '@/components/bible/SearchBar';
import GemCard from '@/components/gems/GemCard';
import GemEditor from '@/components/gems/GemEditor';
import ReportDialog from '@/components/gems/ReportDialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'biblegems_last_verse';
const CHAPTER_PAGE_CACHE_PREFIX = 'biblegems_chapter_page';
const CHAPTER_PAGE_CACHE_TTL_MS = Number.MAX_SAFE_INTEGER;

function loadSavedVerse() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function parseVerseSelection(search = '') {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(search);
  const book = params.get('book');
  const chapter = Number(params.get('chapter'));
  const verse = Number(params.get('verse'));

  if (!book || Number.isNaN(chapter) || Number.isNaN(verse)) return null;
  return { book, chapter, verse };
}

function buildVerseUrl(book, chapter, verse) {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams({ book, chapter: String(chapter), verse: String(verse) });
  return `?${params.toString()}`;
}

function getChapterPageCacheKey(book, chapter) {
  return `${CHAPTER_PAGE_CACHE_PREFIX}:${book}:${chapter}`;
}

function readChapterPageCache(book, chapter) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(getChapterPageCacheKey(book, chapter));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.expiresAt !== 'number' || entry.expiresAt <= Date.now()) {
      window.localStorage.removeItem(getChapterPageCacheKey(book, chapter));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeChapterPageCache(book, chapter, payload) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const entry = {
      expiresAt: Number.MAX_SAFE_INTEGER,
      payload
    };
    window.localStorage.setItem(getChapterPageCacheKey(book, chapter), JSON.stringify(entry));
  } catch {}
}

function invalidateChapterPageCache(book, chapter) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(getChapterPageCacheKey(book, chapter));
  } catch {}
}

export default function Home() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const initialSelection = parseVerseSelection(location.search) || loadSavedVerse() || { book: 'John', chapter: 3, verse: 16 };
  const [book, setBook] = useState(initialSelection.book);
  const [chapter, setChapter] = useState(initialSelection.chapter);
  const [verse, setVerse] = useState(initialSelection.verse);

  const [verseText, setVerseText] = useState('');
  const [translationId, setTranslationId] = useState('');
  const [gems, setGems] = useState([]);
  const [follows, setFollows] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [visibleVerseCount, setVisibleVerseCount] = useState(8);

  const [showEditor, setShowEditor] = useState(false);
  const [editingGem, setEditingGem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [reportTarget, setReportTarget] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.__biblegemsSupabaseDebug?.reset) {
      window.__biblegemsSupabaseDebug.reset();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    base44.entities.Follow.filter({ follower_id: user.id }).then(setFollows).catch(() => {});
    base44.entities.BlockedUser.filter({ blocker_id: user.id })
      .then((results) => setBlockedIds(results.map((row) => row.blocked_id)))
      .catch(() => {});
  }, [user]);

  const isAdmin = user?.role === 'admin';

  const applyVerseSelection = useCallback((nextBook, nextChapter, nextVerse, mode = 'push') => {
    setBook(nextBook);
    setChapter(nextChapter);
    setVerse(nextVerse);

    if (typeof window === 'undefined') return;
    const nextUrl = buildVerseUrl(nextBook, nextChapter, nextVerse);
    const path = `${window.location.pathname}${nextUrl}`;

    if (mode === 'replace') {
      window.history.replaceState({ book: nextBook, chapter: nextChapter, verse: nextVerse }, '', path);
    } else {
      window.history.pushState({ book: nextBook, chapter: nextChapter, verse: nextVerse }, '', path);
    }
  }, []);

  useEffect(() => {
    const parsed = parseVerseSelection(location.search);
    if (parsed) {
      setBook(parsed.book);
      setChapter(parsed.chapter);
      setVerse(parsed.verse);
      return;
    }

    if (typeof window !== 'undefined') {
      const currentUrl = buildVerseUrl(book, chapter, verse);
      const path = `${window.location.pathname}${currentUrl}`;
      window.history.replaceState({ book, chapter, verse }, '', path);
    }
  }, [book, chapter, verse, location.search]);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseVerseSelection(window.location.search);
      if (!parsed) return;
      setBook(parsed.book);
      setChapter(parsed.chapter);
      setVerse(parsed.verse);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loadChapterPageData = useCallback(async (forceRefresh = false) => {
    if (typeof window === 'undefined') return;

    const pref = user?.preferred_translation || 'KJV';
    const cached = !forceRefresh ? readChapterPageCache(book, chapter) : null;

    if (cached?.payload) {
      setGems(cached.payload.gems || []);
      setVerseText(cached.payload.verseText || '');
      setTranslationId(cached.payload.translationId || '');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [verseResults, gemResults] = await Promise.all([
        base44.entities.BibleVerse.filter({ book: book.toLowerCase(), chapter, verse, translation_id: pref }),
        base44.entities.Gem.filter({ book, chapter })
      ]);

      const nextVerseText = verseResults?.length > 0 ? verseResults[0].text : '';
      const nextGems = gemResults || [];

      setGems(nextGems);
      setVerseText(nextVerseText);
      setTranslationId(pref);

      writeChapterPageCache(book, chapter, {
        gems: nextGems,
        verseText: nextVerseText,
        translationId: pref
      });

      if (typeof window !== 'undefined' && window.__biblegemsSupabaseDebug?.logSummary) {
        window.__biblegemsSupabaseDebug.logSummary(`gems:${book}:${chapter}`);
      }
    } catch (error) {
      console.error('Failed to load chapter page data', error);
      setGems([]);
      setVerseText('');
      setTranslationId('');
    } finally {
      setLoading(false);
    }
  }, [book, chapter, verse, user]);

  useEffect(() => {
    setVisibleVerseCount(8);
    loadChapterPageData(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ book, chapter, verse }));
    } catch {}
  }, [book, chapter, verse, loadChapterPageData]);

  useEffect(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      setSearchResults(null);
      return;
    }

    const filtered = gems.filter((gem) => {
      const content = gem.content?.toLowerCase() || '';
      const nickname = gem.user_nickname?.toLowerCase() || '';
      const reference = `${gem.book} ${gem.chapter}:${gem.verse}`.toLowerCase();
      return content.includes(query) || nickname.includes(query) || reference.includes(query);
    });

    setSearchResults(filtered);
  }, [search, gems]);

  const resetEditor = () => {
    setEditingGem(null);
    setShowEditor(false);
  };

  const syncChapterCache = useCallback((nextGems) => {
    writeChapterPageCache(book, chapter, {
      gems: nextGems,
      verseText,
      translationId
    });
  }, [book, chapter, verseText, translationId]);

  const handleSaveGem = async (content) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const previousGems = [...gems];
    const optimisticGem = {
      id: `temp-${Date.now()}`,
      book,
      chapter,
      verse,
      content,
      user_id: user.id,
      user_nickname: user.nickname || user.full_name || user.email?.split('@')[0] || 'Anonymous',
      user_avatar: user.avatar || null,
      likes_count: 0,
      liked_by: [user.id],
      created_date: new Date().toISOString()
    };

    let nextGems;
    if (editingGem) {
      nextGems = previousGems.map((gem) => gem.id === editingGem.id ? { ...gem, content } : gem);
      setGems(nextGems);
      syncChapterCache(nextGems);
    } else {
      nextGems = [optimisticGem, ...previousGems];
      setGems(nextGems);
      syncChapterCache(nextGems);
    }

    setSaving(true);
    try {
      let savedGem;
      if (editingGem) {
        savedGem = await base44.entities.Gem.update(editingGem.id, { content });
        toast({ title: 'Gem updated' });
      } else {
        savedGem = await base44.entities.Gem.create({
          book,
          chapter,
          verse,
          content,
          user_id: user.id,
          user_nickname: user.nickname || user.full_name || user.email?.split('@')[0] || 'Anonymous',
          user_avatar: user.avatar || null,
          likes_count: 0,
          liked_by: [user.id],
          created_date: new Date().toISOString()
        });
        toast({ title: 'Gem saved' });
      }

      const persistedGems = editingGem
        ? nextGems.map((gem) => gem.id === editingGem.id ? { ...gem, ...(savedGem || {}), content: savedGem?.content ?? content } : gem)
        : nextGems.map((gem) => gem.id === optimisticGem.id ? { ...gem, ...(savedGem || {}), content: savedGem?.content ?? content } : gem);

      setGems(persistedGems);
      syncChapterCache(persistedGems);
      resetEditor();
      void loadChapterPageData(true);
    } catch (error) {
      console.error('Could not save gem', error);
      setGems(previousGems);
      syncChapterCache(previousGems);
      toast({ title: 'Unable to save gem', description: error.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditGem = async (gem, content) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const previousGems = [...gems];
    const optimisticGems = previousGems.map((item) => item.id === gem.id ? { ...item, content } : item);
    setGems(optimisticGems);
    syncChapterCache(optimisticGems);

    try {
      const savedGem = await base44.entities.Gem.update(gem.id, { content });
      const persistedGems = optimisticGems.map((item) => item.id === gem.id ? { ...item, ...(savedGem || {}), content: savedGem?.content ?? content } : item);
      setGems(persistedGems);
      syncChapterCache(persistedGems);
      toast({ title: 'Gem updated' });
      setEditingGem(null);
      setShowEditor(false);
      void loadChapterPageData(true);
    } catch (error) {
      console.error('Could not update gem', error);
      setGems(previousGems);
      syncChapterCache(previousGems);
      toast({ title: 'Unable to update gem', description: error.message || 'Please try again.' });
    }
  };

  // Updated report submission implementation (kept from the newer change)
  const handleReportSubmit = async (reason) => {
    if (!user || !reportTarget) return;
    setReportSubmitting(true);
    try {
      const { error } = await insertReport(tables.reports(), {
        target_id: reportTarget.id,
        target_type: 'gem',
        reporter_id: user.id,
        reason,
        status: 'pending',
        created_date: new Date().toISOString()
      });
      if (error) throw error;
      toast({ title: 'Report submitted' });
      setReportTarget(null);
    } catch (error) {
      console.error('Could not submit report', error);
      toast({ title: 'Unable to report', description: error.message || 'Please try again.' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleLikeGem = async (gem) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const isLiked = gem.liked_by?.includes(user.id);
      const newLikedBy = isLiked
        ? gem.liked_by.filter(id => id !== user.id)
        : [...(gem.liked_by || []), user.id];
      await base44.entities.Gem.update(gem.id, {
        liked_by: newLikedBy,
        likes_count: newLikedBy.length
      });
      setGems(gems.map(g => g.id === gem.id ? { ...g, liked_by: newLikedBy, likes_count: newLikedBy.length } : g));
      toast({ title: isLiked ? 'Gem unliked' : 'Gem liked' });
    } catch (error) {
      console.error('Could not toggle like', error);
      toast({ title: 'Unable to like gem', description: error.message || 'Please try again.' });
    }
  };

  const handleDeleteGem = async (gem) => {
    const previousGems = [...gems];
    const optimisticGems = previousGems.filter((item) => item.id !== gem.id);
    setGems(optimisticGems);
    syncChapterCache(optimisticGems);
    toast({ title: 'Gem deleted' });

    try {
      await base44.entities.Gem.delete(gem.id);
      void loadChapterPageData(true);
    } catch (error) {
      console.error('Could not delete gem', error);
      setGems(previousGems);
      syncChapterCache(previousGems);
      toast({ title: 'Unable to delete gem', description: error.message || 'Please try again.' });
    }
  };

  const handleHideGem = async (gem) => {
    if (!user) return;
    try {
      await base44.entities.BlockedUser.create({ blocker_id: user.id, blocked_id: gem.user_id });
      setBlockedIds((prev) => Array.from(new Set([...prev, gem.user_id])));
      setGems((prev) => prev.filter((item) => item.user_id !== gem.user_id));
      toast({ title: 'Blocked this user and hid their gems' });
    } catch (error) {
      console.error('Could not hide gem', error);
      toast({ title: 'Unable to hide gem', description: error.message || 'Please try again.' });
    }
  };

  const handleTagSelect = (tag) => {
    setSearch(tag);
  };

  const handleFollow = async (authorId) => {
    if (!user) return;
    try {
      const alreadyFollowing = follows.some((item) => item.following_id === authorId);
      if (alreadyFollowing) {
        toast({ title: 'Already following this user' });
        return;
      }
      await base44.entities.Follow.create({ follower_id: user.id, following_id: authorId });
      setFollows((prev) => [...prev, { follower_id: user.id, following_id: authorId }]);
      toast({ title: 'Now following this user' });
    } catch (error) {
      console.error('Could not follow', error);
      toast({ title: 'Unable to follow', description: error.message || 'Please try again.' });
    }
  };

  const visibleGems = gems.filter((gem) => !blockedIds.includes(gem.user_id));
  const displayedGems = searchResults ?? visibleGems;

  const groupedVerseGems = useMemo(() => {
    const groups = visibleGems.reduce((acc, gem) => {
      const verse = Number(gem.verse || 1);
      if (!acc[verse]) acc[verse] = [];
      acc[verse].push(gem);
      return acc;
    }, {});

    return Object.entries(groups)
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([verse, verseGems]) => ({
        verse: Number(verse),
        gems: verseGems.sort((a, b) => Number(a.verse || 1) - Number(b.verse || 1))
      }));
  }, [visibleGems]);

  const visibleVerseGroups = groupedVerseGems.slice(0, visibleVerseCount);
  const hasMoreVerseGroups = groupedVerseGems.length > visibleVerseGroups.length;

  if (!user) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center mx-auto max-w-2xl">
        <LogIn className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold mb-2">Welcome to Bible Gems</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Log in to view and save reflections, follow readers, and build your collection of favorite verses.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90">
            Log in
          </Link>
          <Link to="/register" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verse selector */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Select chapter</p>
          </div>
        </div>
        <ScriptureSelector
          book={book}
          chapter={chapter}
          onSelect={(newBook, newChapter, newVerse) => {
            applyVerseSelection(newBook, newChapter, newVerse || 1);
          }}
        />
      </div>

      {/* Search bar */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Search gems</p>
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} />
        <p>&nbsp;</p>
      {/* Gems list */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{displayedGems.length} gem{displayedGems.length !== 1 ? 's' : ''}</p>
          </div>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </div>

        <div className="space-y-4">
          {searchResults ? (
            displayedGems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gems found for your search.</p>
            ) : (
              displayedGems.map((gem) => (
                <GemCard
                  key={gem.id}
                  gem={gem}
                  isOwn={gem.user_id === user.id}
                  currentUserId={user.id}
                  onLike={handleLikeGem}
                  onFollow={handleFollow}
                  onHide={handleHideGem}
                  onReport={() => setReportTarget(gem)}
                  onEdit={handleEditGem}
                  onDelete={handleDeleteGem}
                  onProfileClick={(id) => navigate(`/profile/${id}`)}
                  onNavigateVerse={(book, chapter, verse) => {
                    applyVerseSelection(book, chapter, verse);
                  }}
                  onTagSelect={handleTagSelect}
                  showReference
                  canDelete={isAdmin}
                  isFollowing={follows.some((item) => item.following_id === gem.user_id)}
                />
              ))
            )
          ) : visibleVerseGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gems found for this chapter yet.</p>
          ) : (
            visibleVerseGroups.map(({ verse, gems: verseGems }) => (
              <section key={verse} className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <button
                  onClick={() => applyVerseSelection(book, chapter, verse)}
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2 text-left transition-colors hover:bg-accent"
                >
                  <span className="text-sm font-semibold text-foreground">Verse {verse}</span>
                  <span className="text-xs text-muted-foreground">{verseGems.length} gem{verseGems.length !== 1 ? 's' : ''}</span>
                </button>
                <div className="mt-3 space-y-3">
                  {verseGems.map((gem) => (
                    <GemCard
                      key={gem.id}
                      gem={gem}
                      isOwn={gem.user_id === user.id}
                      currentUserId={user.id}
                      onLike={handleLikeGem}
                      onFollow={handleFollow}
                      onHide={handleHideGem}
                      onReport={() => setReportTarget(gem)}
                      onEdit={handleEditGem}
                      onDelete={handleDeleteGem}
                      onProfileClick={(id) => navigate(`/profile/${id}`)}
                      onNavigateVerse={(nextBook, nextChapter, nextVerse) => {
                        applyVerseSelection(nextBook, nextChapter, nextVerse);
                      }}
                      onTagSelect={handleTagSelect}
                      showReference
                      canDelete={isAdmin}
                      isFollowing={follows.some((item) => item.following_id === gem.user_id)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
          {!searchResults && hasMoreVerseGroups && (
            <Button variant="outline" className="w-full" onClick={() => setVisibleVerseCount((count) => count + 8)}>
              Show more verses
            </Button>
          )}
        </div>
      <p>&nbsp;</p>
      {/* Share / add gem */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Share your gem</p>
          </div>
        </div>
        <Button onClick={() => { resetEditor(); setShowEditor(true); }} className="w-full">
          Add a new gem
        </Button>
        {showEditor && (
          <div className="mt-6">
            <GemEditor
              book={book}
              chapter={chapter}
              verse={verse}
              existingGem={editingGem}
              onSave={handleSaveGem}
              onCancel={resetEditor}
              saving={saving}
            />
          </div>
        )}
      </div>

      <ReportDialog open={!!reportTarget} onClose={() => setReportTarget(null)} onSubmit={handleReportSubmit} submitting={reportSubmitting} />
    </div>
  );
}
