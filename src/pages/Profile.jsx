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

export default function Profile() {
  const { user, setUser } = useOutletContext();
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // /profile with no userId = own profile. Requires login.
  const isOwnProfile = !userId || userId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : userId;

  const [profileUser, setProfileUser] = useState(null);
  const [gems, setGems] = useState([]);
  const [follows, setFollows] = useState([]);
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('latest');
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [prefTranslation, setPrefTranslation] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [followRecord, setFollowRecord] = useState(null);
  const [blockRecord, setBlockRecord] = useState(null);

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);

    const loadProfile = async () => {
      if (isOwnProfile) {
        setProfileUser(user);
        setNickname(user?.nickname || user?.full_name || '');
        setPrefTranslation(user?.preferred_translation || 'KJV');
      } else {
        // For other users, get their gems first and derive display info from there
        // (User entity filter by id isn't directly supported, so we use gem data for the profile header)
        setProfileUser({ id: targetUserId });
      }

      const [userGems, trans] = await Promise.all([
        base44.entities.Gem.filter({ user_id: targetUserId }),
        base44.entities.BibleTranslation.list()
      ]);
      setGems(userGems);
      setTranslations(trans);

      // If other user, derive nickname/avatar from their most recent gem
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
        if (fols.length > 0) { setIsFollowing(true); setFollowRecord(fols[0]); }
        if (blocks.length > 0) { setIsBlocked(true); setBlockRecord(blocks[0]); }
      }
