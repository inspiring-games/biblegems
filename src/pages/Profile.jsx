import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GemCard from '@/components/gems/GemCard';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LogIn, ChevronDown, ChevronUp, Upload } from 'lucide-react';

const sortOptions = [
  { value: 'latest', label: 'Latest' },
  { value: 'favorite', label: 'Popular' }
];

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error('Could not read file'));
  reader.readAsDataURL(file);
});

const getStoragePathFromUrl = (url) => {
  try {
    const marker = '/storage/v1/object/public/avatars/';
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length));
  } catch {
    return null;
  }
};

export default function Profile() {
  const { user, setUser } = useOutletContext();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : userId;

  const [profileUser, setProfileUser] = useState(null);
  const [gems, setGems] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('latest');
  const [nickname, setNickname] = useState('');
  const [prefTranslation, setPrefTranslation] = useState('KJV');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followRecord, setFollowRecord] = useState(null);
  const [blockRecord, setBlockRecord] = useState(null);
  const [following, setFollowing] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [blockRecords, setBlockRecords] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);

    const loadProfile = async () => {
      try {
        if (isOwnProfile) {
          setProfileUser(user);
          setNickname(user?.nickname || user?.full_name || '');
          setPrefTranslation(user?.preferred_translation || 'KJV');
          setAvatarPreview(user?.avatar || '');
        } else {
          setProfileUser({ id: targetUserId });
        }

        const [userGems, trans] = await Promise.all([
          base44.entities.Gem.filter({ user_id: targetUserId }),
          base44.entities.BibleTranslation.list()
        ]);

        setGems(userGems);
        setTranslations(trans);

        if (!isOwnProfile && userGems.length > 0) {
          setProfileUser({
            id: targetUserId,
            full_name: userGems[0].user_nickname,
            avatar: userGems[0].user_avatar
          });
        }

        if (user && !isOwnProfile) {
          const [fols, blocks] = await Promise.all([
            base44.entities.Follow.filter({ follower_id: user.id, following_id: targetUserId }),
            base44.entities.BlockedUser.filter({ blocker_id: user.id, blocked_id: targetUserId })
          ]);
          setIsFollowing(fols.length > 0);
          setFollowRecord(fols[0] || null);
          setIsBlocked(blocks.length > 0);
          setBlockRecord(blocks[0] || null);
        }

        if (user && isOwnProfile) {
          const [followResult, blockResult] = await Promise.all([
            supabase.from('follows').select('*').eq('follower_id', user.id),
            supabase.from('blocked_users').select('*').eq('blocker_id', user.id)
          ]);
          const followRows = followResult.data || [];
          const blockRows = blockResult.data || [];
          const followingIds = followRows.map((row) => row.following_id).filter(Boolean);
          const blockedIds = blockRows.map((row) => row.blocked_id).filter(Boolean);

          const [followingProfiles, blockedProfiles, hiddenGemRows] = await Promise.all([
            followingIds.length > 0 ? supabase.from('profiles').select('*').in('user_id', followingIds) : Promise.resolve({ data: [] }),
            blockedIds.length > 0 ? supabase.from('profiles').select('*').in('user_id', blockedIds) : Promise.resolve({ data: [] }),
            blockedIds.length > 0 ? supabase.from('gems').select('*').in('user_id', blockedIds) : Promise.resolve({ data: [] })
          ]);

          setFollowing(followingProfiles.data || []);
          setBlockedUsers(blockedProfiles.data || []);
          setHiddenGems(hiddenGemRows.data || []);
          setBlockRecords(blockRows);
        }
      } catch (error) {
        console.error('Profile load failed:', error);
        toast({ title: 'Could not load profile', description: error.message || 'Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [targetUserId, user, isOwnProfile, toast]);

  const uploadAvatar = async (file, previousUrl) => {
    const resizedFile = file;
    try {
      if (file.size > 0) {
        const imageBitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imageBitmap, 0, 0, 256, 256);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('Could not process image'))), file.type || 'image/jpeg', 0.9);
        });
        const resized = new File([blob], file.name || 'avatar.png', { type: blob.type || 'image/png' });
        const fileName = `avatar_${user.id}_${Date.now()}.${(resized.name.split('.').pop() || 'png')}`;
        const { error } = await supabase.storage.from('avatars').upload(fileName, resized, { upsert: true, contentType: resized.type });
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
          if (previousUrl) {
            const previousPath = getStoragePathFromUrl(previousUrl);
            if (previousPath) {
              await supabase.storage.from('avatars').remove([previousPath]);
            }
          }
          return data.publicUrl;
        }
      }
    } catch (error) {
      console.warn('Avatar upload failed, falling back to data URL', error);
    }

    const dataUrl = await readFileAsDataUrl(file);
    return dataUrl;
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let avatarUrl = user?.avatar || '';
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, user?.avatar || '');
      }

      const existing = await base44.entities.User.filter({ user_id: user.id });
      let updated;
      if (existing.length > 0) {
        updated = await base44.entities.User.update(existing[0].id, {
          nickname,
          preferred_translation: prefTranslation,
          full_name: nickname,
          avatar: avatarUrl
        });
      } else {
        updated = await base44.entities.User.create({
          user_id: user.id,
          nickname,
          preferred_translation: prefTranslation,
          full_name: nickname,
          avatar: avatarUrl,
          role: 'user'
        });
      }
      const mergedUser = {
        ...user,
        ...updated,
        avatar: avatarUrl,
        profile_id: updated.id,
        id: user.id
      };
      setUser(mergedUser);
      setProfileUser(mergedUser);
      setAvatarFile(null);
      setAvatarPreview(avatarUrl);
      toast({ title: 'Profile saved' });
    } catch (error) {
      console.error('Profile save failed:', error);
      toast({ title: 'Could not save profile', description: error.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFollowToggle = async () => {
    if (!user?.id || !targetUserId || isOwnProfile) return;
    setLoading(true);
    try {
      if (isFollowing && followRecord?.id) {
        await base44.entities.Follow.delete(followRecord.id);
        setIsFollowing(false);
        setFollowRecord(null);
        toast({ title: 'Unfollowed' });
      } else {
        const created = await base44.entities.Follow.create({ follower_id: user.id, following_id: targetUserId });
        setIsFollowing(true);
        setFollowRecord(created);
        toast({ title: 'Following' });
      }
    } catch (error) {
      console.error('Follow toggle failed:', error);
      toast({ title: 'Could not update follow status', description: error.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    if (!user?.id || !targetUserId || isOwnProfile) return;
    setLoading(true);
    try {
      if (isBlocked && blockRecord?.id) {
        await base44.entities.BlockedUser.delete(blockRecord.id);
        setIsBlocked(false);
        setBlockRecord(null);
        toast({ title: 'Unblocked' });
      } else {
        const created = await base44.entities.BlockedUser.create({ blocker_id: user.id, blocked_id: targetUserId });
        setIsBlocked(true);
        setBlockRecord(created);
        toast({ title: 'Blocked' });
      }
    } catch (error) {
      console.error('Block toggle failed:', error);
      toast({ title: 'Could not update block status', description: error.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnhideGem = async (gem) => {
    if (!user?.id) return;
    const record = blockRecords.find((item) => item.blocked_id === gem.user_id);
    if (!record?.id) return;
    try {
      await base44.entities.BlockedUser.delete(record.id);
      setBlockRecords((prev) => prev.filter((item) => item.id !== record.id));
      setHiddenGems((prev) => prev.filter((item) => item.id !== gem.id));
      toast({ title: 'Gem unhidden' });
    } catch (error) {
      console.error('Could not unhide gem', error);
      toast({ title: 'Unable to unhide gem', description: error.message || 'Please try again.' });
    }
  };

  const handleUnblockUser = async (userIdToUnblock) => {
    if (!user?.id) return;
    const record = blockRecords.find((item) => item.blocked_id === userIdToUnblock);
    if (!record?.id) return;
    try {
      await base44.entities.BlockedUser.delete(record.id);
      setBlockRecords((prev) => prev.filter((item) => item.id !== record.id));
      setBlockedUsers((prev) => prev.filter((item) => item.user_id !== userIdToUnblock));
      toast({ title: 'User unblocked' });
    } catch (error) {
      console.error('Could not unblock user', error);
      toast({ title: 'Unable to unblock user', description: error.message || 'Please try again.' });
    }
  };

  const sortedGems = [...gems].sort((a, b) => {
    if (sort === 'favorite') return (b.likes_count || 0) - (a.likes_count || 0);
    return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
  });

  if (!targetUserId) {
    return (
      <div className="text-center py-16">
        <LogIn className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Log in or select a profile to view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={avatarPreview || profileUser?.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {(profileUser?.full_name || profileUser?.nickname || 'U').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{profileUser?.full_name || 'Profile'}</p>
              <p className="text-sm text-muted-foreground">{isOwnProfile ? 'Your profile' : 'User profile'}</p>
            </div>
          </div>
          {!isOwnProfile && user?.id && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleFollowToggle} disabled={loading}>
                {isFollowing ? 'Unfollow' : 'Follow'}
              </Button>
              <Button variant={isBlocked ? 'destructive' : 'outline'} size="sm" onClick={handleBlockToggle} disabled={loading}>
                {isBlocked ? 'Unblock' : 'Block'}
              </Button>
            </div>
          )}
        </div>

        {isOwnProfile && (
          <div className="mt-6 space-y-4">
            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-border p-2 text-muted-foreground">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Avatar image</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. It will be resized to 256×256 and stored in your avatar bucket.</p>
                </div>
              </div>
              <Input type="file" accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Display name</label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Nickname" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Preferred translation</label>
                <Select value={prefTranslation} onValueChange={setPrefTranslation}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Translation" />
                  </SelectTrigger>
                  <SelectContent>
                    {translations.map((translation) => (
                      <SelectItem key={translation.id} value={translation.translation_id}>
                        {translation.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={saveProfile} disabled={loading || !nickname.trim()}>
              {loading ? 'Saving…' : 'Save profile'}
            </Button>

            <div className="space-y-3 pt-2">
              <details className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <summary className="cursor-pointer text-sm font-medium">Following ({following.length})</summary>
                <div className="mt-3 space-y-2">
                  {following.length > 0 ? following.map((person) => (
                    <Link key={person.id} to={`/profile/${person.user_id}`} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-sm hover:bg-accent">
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={person.avatar} />
                        <AvatarFallback>{(person.full_name || person.nickname || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{person.full_name || person.nickname || 'User'}</span>
                    </Link>
                  )) : <p className="text-sm text-muted-foreground">You are not following anyone yet.</p>}
                </div>
              </details>

              <details className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <summary className="cursor-pointer text-sm font-medium">Hidden gems ({hiddenGems.length})</summary>
                <div className="mt-3 space-y-2">
                  {hiddenGems.length > 0 ? hiddenGems.map((gem) => (
                    <div key={gem.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{gem.content?.slice(0, 80) || 'Hidden gem'}</p>
                        <p className="text-xs text-muted-foreground">From a blocked user</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUnhideGem(gem)}>
                        Unhide
                      </Button>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No hidden gems at the moment.</p>}
                </div>
              </details>

              <details className="rounded-2xl border border-border/70 bg-background/50 p-4">
                <summary className="cursor-pointer text-sm font-medium">Blocked users ({blockedUsers.length})</summary>
                <div className="mt-3 space-y-2">
                  {blockedUsers.length > 0 ? blockedUsers.map((person) => (
                    <div key={person.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/70 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarImage src={person.avatar} />
                          <AvatarFallback>{(person.full_name || person.nickname || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{person.full_name || person.nickname || 'User'}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleUnblockUser(person.user_id)}>
                        Unblock
                      </Button>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">You have not blocked anyone yet.</p>}
                </div>
              </details>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Gems</p>
            <p className="text-xl font-semibold">{sortedGems.length} gems</p>
          </div>
          <Tabs value={sort} onValueChange={setSort}>
            <TabsList>
              {sortOptions.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="text-sm">
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sortedGems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No gems yet.</p>
          ) : (
            sortedGems.map((gem) => (
              <GemCard
                key={gem.id}
                gem={gem}
                isOwn={gem.user_id === user?.id}
                currentUserId={user?.id}
                onProfileClick={(id) => navigate(`/profile/${id}`)}
                onNavigateVerse={(book, chapter, verse) => {
                  navigate(`/?book=${encodeURIComponent(book)}&chapter=${chapter}&verse=${verse}`);
                }}
                canDelete={user?.role === 'admin'}
                showReference
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
