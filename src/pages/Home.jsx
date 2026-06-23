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
import { BIBLE_BOOKS } from '@/lib/bibleData';

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

  // Load user's follows and blocks
  useEffect(() => {
    if (!user) return;
    base44.entities.Follow.filter({ follower_id: user.id }).then(setFollows).catch(() => {});
    base44.entities.BlockedUser.filter({ blocker_id: user.id }).then(b => setBlockedIds(b.map(x => x.blocked_id))).catch(() => {});
  }, [user]);

  // Load verse text — lowercase book to match imported data
  useEffect(() => {
    const pref = user?.preferred_translation || 'KJV';
    base44.entities.BibleVerse.filter({
      book: book.toLowerCase(), chapter, verse, translation_id: pref
    }).then(results => {
      if (results.length > 0) {
        setVerseText(results[0].text);
        setTranslationId(pref);
      } else {
        setVerseText('');
        setTranslationId('');
      }
    }).catch(() => { setVerseText(''); setTranslationId(''); });
  }, [book, chapter, verse, user]);

  // Load gems for verse
  const loadGems = useCallback(() => {
    setLoading(true);
    base44.entities.Gem.filter({ book, chapter, verse }).then(results => {
