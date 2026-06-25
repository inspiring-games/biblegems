import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ScriptureSelector from '@/components/bible/ScriptureSelector';
import VerseDisplay from '@/components/bible/VerseDisplay';
import SearchBar from '@/components/bible/SearchBar';
import GemCard from '@/components/gems/GemCard';
import GemEditor from '@/components/gems/GemEditor';
import ReportDialog from '@/components/gems/ReportDialog';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'biblegems_last_verse';

function loadSavedVerse() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export default function Home() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  const saved = loadSavedVerse();
  const [book, setBook] = useState(saved?.book || 'John');
  const [chapter, setChapter] = useState(saved?.chapter || 3);
  const [verse, setVerse] = useState(saved?.verse || 16);

  const [verseText, setVerseText] = useState('');
  const [translationId, setTranslationId] = useState('');
  const [gems, setGems] = useState([]);
  const [follows, setFollows] = useState([]);
  const [blockedIds, setBlockedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editingGem, setEditingGem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [reportTarget, setReportTarget] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;

    base44.entities.Follow.filter({ follower_id: user.id }).then(setFollows).catch(() => {});
    base44.entities.BlockedUser.filter({ blocker_id: user.id })
      .then((results) => setBlockedIds(results.map((row) => row.blocked_id)))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    const pref = user?.preferred_translation || 'KJV';

    base44.entities.BibleVerse.filter({ book: book.toLowerCase(), chapter, verse, translation_id: pref })
      .then((results) => {
        if (results.length > 0) {
          setVerseText(results[0].text);
          setTranslationId(pref);
        } else {
          setVerseText('');
          setTranslationId('');
        }
      })
      .catch(() => {
        setVerseText('');
        setTranslationId('');
      });
  }, [book, chapter, verse, user]);

  const loadGems = useCallback(() => {
    setLoading(true);
    base44.entities.Gem.filter({ book, chapter, verse })
      .then((results) => setGems(results))
      .catch(() => setGems([]))
      .finally(() => setLoading(false));
  }, [book, chapter, verse]);

  useEffect(() => {
    loadGems();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ book, chapter, verse }));
    } catch {}
  }, [book, chapter, verse, loadGems]);

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

  const handleSaveGem = async (content) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setSaving(true);
    try {
      if (editingGem) {
        await base44.entities.Gem.update(editingGem.id, { content });
        toast({ title: 'Gem updated' });
      } else {
        await base44.entities.Gem.create({
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
      resetEditor();
      loadGems();
    } catch (error) {
      console.error('Could not save gem', error);
      toast({ title: 'Unable to save gem', description: error.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditGem = (gem) => {
    setEditingGem(gem);
    setShowEditor(true);
  };

  const handleReportSubmit = async (reason) => {
    if (!user || !reportTarget) return;
    setReportSubmitting(true);
    try {
      await base44.entities.Report.create({
        gem_id: reportTarget.id,
        reporter_id: user.id,
        reason,
        created_date: new Date().toISOString()
      });
      toast({ title: 'Report submitted' });
      setReportTarget(null);
    } catch (error) {
      console.error('Could not submit report', error);
      toast({ title: 'Unable to report', description: error.message || 'Please try again.' });
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleHideGem = async (gem) => {
    if (!user) return;
    try {
      await base44.entities.BlockedUser.create({ blocker_id: user.id, blocked_id: gem.user_id });
      setBlockedIds((prev) => Array.from(new Set([...prev, gem.user_id])));
      setGems((prev) => prev.filter((item) => item.user_id !== gem.user_id));
      toast({ title: 'Hidden gems from this user' });
    } catch (error) {
      console.error('Could not hide gem', error);
      toast({ title: 'Unable to hide gem', description: error.message || 'Please try again.' });
    }
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
  const verseReference = `${book} ${chapter}:${verse}`;

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
      {/* Verse selector first */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
        </div>
        <ScriptureSelector
          book={book}
          chapter={chapter}
          verse={verse}
          onSelect={(newBook, newChapter, newVerse) => {
            setBook(newBook);
            setChapter(newChapter);
            setVerse(newVerse);
          }}
        />
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold">{verseReference}</h2>
          </div>
        </div>
        <VerseDisplay book={book} chapter={chapter} verse={verse} text={verseText} translation={translationId} />
      </div>

      {/* Search bar */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Search gems</p>
            <p className="text-sm text-muted-foreground">Search reflections for this verse.</p>
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} onClear={() => setSearch('')} />
      </div>

      {/* Share / add gem */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Reflection</p>
            <p className="text-lg font-semibold">Share your gem</p>
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

      {/* Gems list */}
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Gems</p>
            <p className="text-lg font-semibold">{displayedGems.length} reflections</p>
          </div>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
        </div>

        <div className="space-y-4">
          {displayedGems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gems found for this verse yet.</p>
          ) : (
            displayedGems.map((gem) => (
              <GemCard
                key={gem.id}
                gem={gem}
                isOwn={gem.user_id === user.id}
                currentUserId={user.id}
                onFollow={handleFollow}
                onHide={handleHideGem}
                onReport={() => setReportTarget(gem)}
                onEdit={handleEditGem}
                onProfileClick={(id) => navigate(`/profile/${id}`)}
                showReference
                isFollowing={follows.some((item) => item.following_id === gem.user_id)}
              />
            ))
          )}
        </div>
      </div>

      <ReportDialog open={!!reportTarget} onClose={() => setReportTarget(null)} onSubmit={handleReportSubmit} submitting={reportSubmitting} />
    </div>
  );
}
