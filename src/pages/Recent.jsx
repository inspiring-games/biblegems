import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Loader2, Clock3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function Recent() {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [gems, setGems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockedIds, setBlockedIds] = useState([]);

  useEffect(() => {
    const loadRecentGems = async () => {
      try {
        setLoading(true);
        const [results, blockedRows] = await Promise.all([
          base44.entities.Gem.list('-created_date', 20),
          user?.id
            ? base44.entities.BlockedUser.filter({ blocker_id: user.id }).catch(() => [])
            : Promise.resolve([])
        ]);
        setGems(results || []);
        setBlockedIds((blockedRows || []).map((row) => row.blocked_id));
      } catch {
        setGems([]);
        setBlockedIds([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentGems();
  }, [user?.id]);

  const visibleGems = useMemo(() => gems.filter((gem) => !blockedIds.includes(gem.user_id)), [blockedIds, gems]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Recent gems</p>
            <h1 className="text-2xl font-semibold">Latest reflections</h1>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visibleGems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent gems yet.</p>
          ) : (
            visibleGems.map((gem) => (
              <div key={gem.id} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {gem.content?.replace(/[#*`_>~]/g, '').slice(0, 120) || 'Untitled gem'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {gem.book} {gem.chapter}:{gem.verse}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/?book=${encodeURIComponent(gem.book)}&chapter=${gem.chapter}&verse=${gem.verse}`)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
