import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Gem, Menu, X, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function AppHeader({ user }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const initials = (user?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Recent', path: '/recent' }
  ];
  if (user) navItems.push({ label: 'My Profile', path: '/profile' });
  if (isAdmin) navItems.push({ label: 'Admin', path: '/admin' });

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <Gem className="w-5 h-5 text-primary" />
          <span className="font-display text-xl font-semibold text-foreground">Bible Gems</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                size="sm"
                className="text-sm font-heading"
              >
                {item.label}
              </Button>
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-2 ml-2">
              <Link to="/profile">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar} />
                  <AvatarFallback className="bg-accent text-accent-foreground text-xs">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => logout()} className="text-sm font-heading text-muted-foreground gap-1.5">
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </Button>
            </div>
          ) : (
            <Link to="/login" className="ml-2">
              <Button size="sm" variant="default" className="text-sm font-heading">Sign in</Button>
            </Link>
          )}
        </nav>

        {/* Mobile menu button */}
        <button className="sm:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {navItems.map(item => (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}>
              <Button
                variant={location.pathname === item.path ? 'secondary' : 'ghost'}
                className="w-full justify-start text-sm font-heading"
              >
                {item.label}
              </Button>
            </Link>
          ))}
          {user ? (
            <Button variant="ghost" onClick={() => logout()} className="w-full justify-start text-sm font-heading text-muted-foreground gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </Button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="default" className="w-full justify-start text-sm font-heading">Sign in</Button>
            </Link>
          )}
        </div>
      )}
    </header>
  );
}