import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload, Shield, Users, Flag, BookOpen, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function Admin() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user && user.role !== 'admin') {
    return (
      <div className="text-center py-16">
        <Shield className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-heading font-semibold">Admin Dashboard</h1>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports" className="gap-1.5"><Flag className="w-3.5 h-3.5" /> Reports</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Import Bible</TabsTrigger>
        </TabsList>

        <TabsContent value="reports"><ReportsPanel toast={toast} /></TabsContent>
        <TabsContent value="users"><UsersPanel toast={toast} navigate={navigate} /></TabsContent>
        <TabsContent value="import"><ImportPanel toast={toast} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ReportsPanel({ toast }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Report.list('-created_date', 50).then(r => { setReports(r); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const updateStatus = async (report, status) => {
    await base44.entities.Report.update(report.id, { status });
    setReports(reports.map(r => r.id === report.id ? { ...r, status } : r));
    toast({ title: `Report ${status}` });
  };

  const deleteGem = async (report) => {
    if (report.target_type === 'gem') {
      await base44.entities.Gem.delete(report.target_id);
      await base44.entities.Report.update(report.id, { status: 'resolved', admin_notes: 'Content removed' });
      setReports(reports.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
      toast({ title: 'Gem removed' });
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const statusColors = { pending: 'bg-yellow-100 text-yellow-800', reviewed: 'bg-blue-100 text-blue-800', resolved: 'bg-green-100 text-green-800', dismissed: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-3 mt-4">
      {reports.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No reports yet.</p>}
      {reports.map(report => (
        <div key={report.id} className="p-4 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={statusColors[report.status] || ''}>{report.status}</Badge>
              <span className="text-xs text-muted-foreground capitalize">{report.target_type}</span>
            </div>
            <span className="text-xs text-muted-foreground">{new Date(report.created_date).toLocaleDateString()}</span>
          </div>
          <p className="text-sm">{report.reason}</p>
          {report.status === 'pending' && (
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => updateStatus(report, 'reviewed')} className="gap-1 text-xs">
                <CheckCircle className="w-3 h-3" /> Mark Reviewed
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus(report, 'dismissed')} className="gap-1 text-xs">
                <XCircle className="w-3 h-3" /> Dismiss
              </Button>
              {report.target_type === 'gem' && (
                <Button size="sm" variant="destructive" onClick={() => deleteGem(report)} className="gap-1 text-xs">
                  <Trash2 className="w-3 h-3" /> Remove Content
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UsersPanel({ toast, navigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagingUser, setMessagingUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  const loadUsers = () => {
    setLoading(true);
    base44.entities.User.list('-created_date', 200)
      .then(u => { setUsers(u); setLoading(false); })
      .catch(err => { console.error('User list error:', err); setLoading(false); });
  };

  useEffect(() => { loadUsers(); }, []);

  const handleBan = async (u) => {
    const newRole = u.role === 'banned' ? 'user' : 'banned';
    await base44.entities.User.update(u.id, { role: newRole });
    setUsers(users.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    toast({ title: newRole === 'banned' ? `${u.full_name || u.email} banned` : `${u.full_name || u.email} unbanned` });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !messagingUser) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: messagingUser.email,
      subject: 'Message from Bible Gems Admin',
      body: messageText
    });
    setSending(false);
    setMessagingUser(null);
    setMessageText('');
    toast({ title: 'Message sent', description: `Email sent to ${messagingUser.email}` });
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3 mt-4">
      {users.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found.</p>}
      {users.map(u => (
        <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
          <Avatar className="w-9 h-9">
            <AvatarImage src={u.avatar} />
            <AvatarFallback className="bg-accent text-accent-foreground text-xs">{(u.full_name || u.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{u.full_name || u.email}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
          <Badge variant="outline" className={`text-xs ${u.role === 'banned' ? 'border-destructive text-destructive' : ''}`}>{u.role || 'user'}</Badge>
          <Button size="sm" variant="ghost" onClick={() => navigate(`/profile/${u.id}`)} className="text-xs">View</Button>
          <Button size="sm" variant="ghost" onClick={() => { setMessagingUser(u); setMessageText(''); }} className="text-xs">Message</Button>
          <Button size="sm" variant="ghost" onClick={() => handleBan(u)} className={`text-xs ${u.role === 'banned' ? 'text-green-600' : 'text-destructive'}`}>
            {u.role === 'banned' ? 'Unban' : 'Ban'}
          </Button>
        </div>
      ))}

      {messagingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setMessagingUser(null)}>
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md mx-4 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-heading font-semibold text-sm">Message {messagingUser.full_name || messagingUser.email}</h3>
            <Textarea value={messageText} onChange={e => setMessageText(e.target.value)} placeholder="Type your message…" className="min-h-[100px]" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setMessagingUser(null)}>Cancel</Button>
              <Button size="sm" onClick={handleSendMessage} disabled={!messageText.trim() || sending}>
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportPanel({ toast }) {
  const [translationId, setTranslationId] = useState('');
  const [translationName, setTranslationName] = useState('');
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [translations, setTranslations] = useState([]);
  const fileRef = useRef(null);

  useEffect(() => {
    base44.entities.BibleTranslation.list().then(setTranslations).catch(() => {});
  }, []);

  const BATCH_SIZE = 50;
  const BATCH_DELAY_MS = 800; // pause between batches to avoid rate limiting
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const parseCSV = (text) => {
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleaned.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Detect delimiter from first line
    const firstLine = lines[0];
    const delim = ['\t', '|', ';', ','].find(d => firstLine.includes(d)) || ',';

    const splitLine = (line) => {
      const fields = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuotes = !inQuotes; }
        else if (ch === delim && !inQuotes) { fields.push(current.replace(/^"|"$/g, '').trim()); current = ''; }
        else { current += ch; }
      }
      fields.push(current.replace(/^"|"$/g, '').trim());
      return fields;
    };

    const firstFields = splitLine(firstLine);
    const headerLower = firstFields.map(f => f.toLowerCase().replace(/[^a-z]/g, ''));

    let bookIdx = -1, chapterIdx = -1, verseIdx = -1, textIdx = -1;
    bookIdx    = headerLower.findIndex(f => ['book','bookname'].includes(f));
    chapterIdx = headerLower.findIndex(f => ['chapter','chap'].includes(f));
    verseIdx   = headerLower.findIndex(f => ['verse','versenumber'].includes(f));
    textIdx    = headerLower.findIndex(f => ['text','versetext','scripture','content'].includes(f));

    let dataLines;
    if (bookIdx !== -1 && chapterIdx !== -1 && verseIdx !== -1 && textIdx !== -1) {
      dataLines = lines.slice(1); // has header
    } else {
      // No recognized header — detect layout from first data line
      dataLines = lines;
      const s = splitLine(firstLine);
      if (s.length >= 5 && !isNaN(Number(s[0])) && isNaN(Number(s[1]))) {
        bookIdx = 1; chapterIdx = 2; verseIdx = 3; textIdx = 4; // id,book,ch,vs,text
      } else {
        bookIdx = 0; chapterIdx = 1; verseIdx = 2; textIdx = 3; // book,ch,vs,text
      }
    }

    return dataLines.map(line => {
      const f = splitLine(line);
      const book = f[bookIdx]?.trim();
      const chapter = parseInt(f[chapterIdx]);
      const verse = parseInt(f[verseIdx]);
      const text = f[textIdx]?.trim();
      if (!book || isNaN(chapter) || isNaN(verse) || !text) return null;
      return { book, chapter, verse, text };
    }).filter(Boolean);
  };

  const handleImport = async () => {
    if (!file || !translationId || !translationName) return;
    setImporting(true);
    setProgress(0);
    setStatusText('Reading file…');

    // Read the file directly as text
    const text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });

    setStatusText('Parsing verses…');
    const verses = parseCSV(text);

    if (verses.length === 0) {
      toast({ title: 'Import failed', description: 'No valid verses found. Ensure columns are: book, chapter, verse, text', variant: 'destructive' });
      setImporting(false);
      return;
    }

    const total = verses.length;
    let imported = 0;

    setStatusText(`Importing ${total} verses in batches…`);

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE).map(v => ({
        translation_id: translationId,
        book: v.book,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text
      }));
      await base44.entities.BibleVerse.bulkCreate(batch);
      imported += batch.length;
      setProgress(Math.round((imported / total) * 100));
      setStatusText(`Imported ${imported} of ${total} verses…`);
      if (i + BATCH_SIZE < total) await sleep(BATCH_DELAY_MS);
    }

    // Create or update translation record
    const existing = translations.find(t => t.translation_id === translationId);
    if (existing) {
      await base44.entities.BibleTranslation.update(existing.id, { verse_count: (existing.verse_count || 0) + total });
    } else {
      await base44.entities.BibleTranslation.create({ translation_id: translationId, name: translationName, verse_count: total });
    }

    setImporting(false);
    setProgress(100);
    setStatusText(`Done! Imported ${total} verses.`);
    setFile(null);
    toast({ title: 'Import complete', description: `${total} verses imported for ${translationName}` });
    base44.entities.BibleTranslation.list().then(setTranslations).catch(() => {});
  };

  return (
    <div className="space-y-5 mt-4">
      <div className="p-4 rounded-lg border border-border bg-card space-y-4">
        <h3 className="font-heading font-medium text-sm">Import Bible Translation</h3>
        <p className="text-xs text-muted-foreground">Upload a CSV file with columns: book, chapter, verse, text. Verses will be imported in staggered batches.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input value={translationId} onChange={(e) => setTranslationId(e.target.value.toUpperCase())} placeholder="Translation code (e.g. KJV)" />
          <Input value={translationName} onChange={(e) => setTranslationName(e.target.value)} placeholder="Full name (e.g. King James Version)" />
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files[0])} className="hidden" />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            {file ? file.name : 'Choose CSV file'}
          </Button>
        </div>
        {importing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{statusText}</p>
          </div>
        )}
        <Button onClick={handleImport} disabled={importing || !file || !translationId || !translationName}>
          {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importing…</> : 'Start Import'}
        </Button>
      </div>

      {translations.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-heading font-medium text-sm">Installed Translations</h3>
          {translations.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div>
                <span className="text-sm font-medium">{t.name}</span>
                <span className="text-xs text-muted-foreground ml-2">({t.translation_id})</span>
              </div>
              <span className="text-xs text-muted-foreground">{t.verse_count || 0} verses</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}