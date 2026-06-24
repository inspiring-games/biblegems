import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GemCard from '@/components/gems/GemCard';
import { getBookOrder } from '@/lib/bibleData';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Settings, UserPlus, UserCheck, Ban, Gem as GemIcon, LogIn } from 'lucide-react';

const sortOptions = [
  { value: 'latest', label: 'Latest' },
  { value: 'favorite', label: 'Popular' }
];

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
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [prefTranslation, setPrefTranslation] = useState('KJV');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followRecord, setFollowRecord] = useState(null);
  const [blockRecord, setBlockRecord] = useState(null);

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);

    const loadProfile = async () => {
      try {
        if (isOwnProfile) {
          setProfileUser(user);
          setNickname(user?.nickname || user?.full_name || '');
          setPrefTranslation(user?.preferred_translation || 'KJV');
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
      } catch (error) {
        console.error('Profile load failed:', error);
        toast({ title: 'Could not load profile', description: error.message || 'Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [targetUserId, user, isOwnProfile, toast]);

  const saveProfile = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const existing = await base44.entities.User.filter({ user_id: user.id });
      let updated;
      if (existing.length > 0) {
        updated = await base44.entities.User.update(existing[0].id, {
          nickname,
          preferred_translation: prefTranslation,
          full_name: nickname
        });
      } else {
        updated = await base44.entities.User.create({
          user_id: user.id,
          nickname,
          preferred_translation: prefTranslation,
          full_name: nickname,
          role: 'user'
        });
      }
      const mergedUser = {
        ...user,
        ...updated,
        profile_id: updated.id,
        id: user.id
      };
      setUser(mergedUser);
      setProfileUser(mergedUser);
      setEditing(false);
      toast({ title: 'Profile saved' });
    } catch (error) {
      console.error('Profile save failed:', error);
      toast({ title: 'Could not save profile', description: error.message || 'Please try again.' });
    } finally {
      setLoading(false);
    }
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
              <AvatarImage src={profileUser?.avatar} />
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
                showReference
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
