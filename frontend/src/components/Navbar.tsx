import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings, Menu, Bookmark } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import logo from '@/assets/logo.png';
import { useState, useEffect } from 'react';
import { getImageUrl } from '@/utils/imageUrl';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const dashboardPath = user?.role === 'student' ? '/student/dashboard'
    : user?.role === 'company' ? '/company/dashboard'
      : '/admin/dashboard';

  const isStudent = user?.role === 'student';
  const hasOnboarded = isStudent ? (user as any).hasCompletedOnboarding : true;

  const navLinks = !isAuthenticated ? [
    { label: 'Browse Opportunities', path: '/internships' },
    { label: 'Top Rank Volunteer', path: '/top-rank-volunteer' },
  ] : user?.role === 'student' ? [
    { label: 'Dashboard', path: '/student/dashboard' },
    { label: 'Browse', path: '/internships' },
    { label: 'Top Rank Volunteer', path: '/top-rank-volunteer' },
    { label: 'Profile', path: '/student/profile' },
  ] : user?.role === 'company' ? [
    { label: 'Dashboard', path: '/company/dashboard' },
    { label: 'My Opportunities', path: '/company/internships' },
    { label: 'Top Rank Volunteer', path: '/top-rank-volunteer' },
    { label: 'Post Opportunity', path: '/company/internships/create' },
    { label: 'Analytics', path: '/company/analytics' },
  ] : [
    { label: 'Dashboard', path: '/admin/dashboard' },
    { label: 'Top Rank Volunteer', path: '/top-rank-volunteer' },
  ];

  const displayName = user?.role === 'student' ? (user as any).username
    : user?.role === 'company' ? (user as any).companyName
      : user?.role === 'admin' ? (user as any).username : '';

  const profileImage = getImageUrl((user as any)?.profileImage || (user as any)?.logo);

  useEffect(() => {
    setImgError(false);
  }, [profileImage]);

  const displayNavLinks = (isAuthenticated && isStudent && !hasOnboarded) ? [] : navLinks;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-card/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to={isAuthenticated && hasOnboarded ? dashboardPath : '/'} className="flex items-center gap-2 group">
            <img src={logo} alt="inPlace Logo" className="h-9 w-auto group-hover:scale-105 transition-transform" />
            <span className="text-xl font-bold gradient-primary-text hidden sm:block">inPlace</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {displayNavLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <div className="hidden md:flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Login
                </Link>
                <Link to="/signup">
                  <Button className="gradient-primary text-primary-foreground h-9 px-5 rounded-full shadow-md shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {isAuthenticated && (
              <div className="flex items-center gap-2">
                {/* Notification Bell — all roles */}
                {hasOnboarded && (
                  <NotificationBell />
                )}

                {/* Saved — students only */}
                {hasOnboarded && isStudent && (
                  <Button variant="ghost" size="icon" onClick={() => navigate('/saved')} className="hidden sm:flex text-muted-foreground hover:text-primary">
                    <Bookmark className="h-5 w-5" />
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 pl-2 pr-4 rounded-full border border-border hover:border-primary/50 transition-colors">
                      <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center overflow-hidden">
                        {profileImage && !imgError ? (
                          <img
                            src={profileImage}
                            alt={displayName || 'User'}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <span className="hidden sm:block text-sm font-medium">{displayName}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl">
                    {hasOnboarded && (
                      <DropdownMenuItem onClick={() => navigate(user?.role === 'company' ? '/company/profile' : '/student/profile')} className="py-2.5 cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" /> Profile Settings
                      </DropdownMenuItem>
                    )}
                    {hasOnboarded && (
                      <DropdownMenuItem onClick={() => navigate('/notifications')} className="py-2.5 cursor-pointer">
                        <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                        </svg>
                        Notifications
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive py-2.5 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile menu */}
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 space-y-1 animate-fade-in border-t border-border/50">
            {displayNavLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.path
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && hasOnboarded && (
              <>
                <div className="h-px bg-border my-2"></div>
                {isStudent && (
                  <Link to="/saved" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                    <span className="flex items-center gap-2"><Bookmark className="h-4 w-4" /> Saved Opportunities</span>
                  </Link>
                )}
                <Link to="/notifications" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    Notifications
                  </span>
                </Link>
              </>
            )}
            {!isAuthenticated && (
              <>
                <div className="h-px bg-border my-2"></div>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent">Login</Link>
                <Link to="/signup" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
