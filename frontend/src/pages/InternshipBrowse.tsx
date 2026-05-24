import { useEffect, useState } from 'react';
import { useInternshipStore } from '@/store/internshipStore';
import { AppLayout } from '@/components/AppLayout';
import { OpportunityCard } from '@/components/OpportunityCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Briefcase, Filter, Sparkles, AlertCircle, User as UserIcon } from 'lucide-react';
import { INTEREST_CATEGORIES } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { recommendationService } from '@/services/api';
import { Link } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StudentProfile, Opportunity } from '@/types';

// Extend Opportunity with recommendation fields for display
type RecommendedOpportunity = Opportunity & {
  matchScore?: number | null;
  matchReason?: string;
};


interface RecommendationState {
  loading: boolean;
  recommendations: RecommendedOpportunity[];
  needsProfileCompletion: boolean;
  needsOnboarding: boolean;
  message: string;
  error: boolean;
}

export default function InternshipBrowse() {
  const { internships, fetchInternships, isLoading } = useInternshipStore();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [paidFilter, setPaidFilter] = useState('all');

  const [recState, setRecState] = useState<RecommendationState>({
    loading: false,
    recommendations: [],
    needsProfileCompletion: false,
    needsOnboarding: false,
    message: '',
    error: false,
  });

  const isStudent = user?.role === 'student';
  const student = isStudent ? (user as StudentProfile) : null;
  const hasCompletedOnboarding = student?.hasCompletedOnboarding ?? false;

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

  useEffect(() => {
    if (!isStudent || !hasCompletedOnboarding) return;

    setRecState(prev => ({ ...prev, loading: true, error: false }));

    recommendationService.getMyRecommendations()
      .then(res => {
        // Safe for both response shapes:
        // Shape A (interceptor already unwrapped): res = { recommendations, needsProfileCompletion }
        // Shape B (raw Axios response): res = { data: { recommendations, needsProfileCompletion } }
        const resData = (res as any)?.data ?? res;
        let recommendations: RecommendedOpportunity[] = [];
        let needsProfileCompletion = false;

        if (resData) {
          if (Array.isArray(resData.recommendations)) {
            recommendations = resData.recommendations;
            needsProfileCompletion = !!resData.needsProfileCompletion;
          } else if (resData.data && Array.isArray(resData.data.recommendations)) {
            recommendations = resData.data.recommendations;
            needsProfileCompletion = !!resData.data.needsProfileCompletion;
          }
        }

        setRecState({
          loading: false,
          recommendations,
          needsProfileCompletion,
          needsOnboarding: false,
          message: resData?.message || '',
          error: false,
        });
      })
      .catch(() => {
        // Silent fail — don't crash the browse page
        setRecState(prev => ({ ...prev, loading: false, error: true }));
      });
  }, [isStudent, hasCompletedOnboarding]);

  const filteredOpportunities = internships.filter(opp => {
    const matchesSearch = 
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || opp.category === categoryFilter;
    const matchesMode = modeFilter === 'all' || opp.mode === modeFilter;
    const matchesPaid = paidFilter === 'all' || (paidFilter === 'paid' ? opp.isPaid : !opp.isPaid);

    return matchesSearch && matchesCategory && matchesMode && matchesPaid;
  });

  // Derived filtered opportunity sub-collections
  const interactedOpportunities = isStudent ? filteredOpportunities.filter(o => o.hasApplied) : [];
  const visibleBrowseOpportunities = isStudent ? filteredOpportunities.filter(o => !o.hasApplied) : filteredOpportunities;
  const visibleRecommendations = recState.recommendations.filter(opp => {
    const matchesSearch = 
      opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.companyName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || opp.category === categoryFilter;
    const matchesMode = modeFilter === 'all' || opp.mode === modeFilter;
    const matchesPaid = paidFilter === 'all' || (paidFilter === 'paid' ? opp.isPaid : !opp.isPaid);
    const matchesNotApplied = !opp.hasApplied;

    return matchesSearch && matchesCategory && matchesMode && matchesPaid && matchesNotApplied;
  });

  const showRecommendations = isStudent && hasCompletedOnboarding && !recState.error && visibleRecommendations.length > 0;
  const showProfileBanner = isStudent && !recState.loading && !recState.error && recState.needsProfileCompletion;
  const showOnboardingBanner = isStudent && !hasCompletedOnboarding;

  return (
    <AppLayout>
      <div className="bg-primary/5 py-16 border-b border-border/50 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Discover <span className="gradient-primary-text">Opportunities</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Find the perfect place to make an impact. We match your personality with causes that matter.
          </p>

          <div className="max-w-4xl mx-auto mt-8 bg-card p-2 rounded-2xl shadow-xl shadow-primary/5 border border-primary/10 flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by role or organization..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-none bg-transparent focus-visible:ring-0 text-base"
              />
            </div>
            <div className="w-px bg-border hidden md:block"></div>
            <div className="md:w-48 relative">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-12 border-none bg-transparent focus:ring-0 text-base">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {INTEREST_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-px bg-border hidden md:block"></div>
            <div className="md:w-40 relative">
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="h-12 border-none bg-transparent focus:ring-0 text-base">
                  <SelectValue placeholder="Work Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Mode</SelectItem>
                  <SelectItem value="online">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="offline">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="h-12 px-8 rounded-xl gradient-primary text-primary-foreground hidden md:flex">
              Search
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

        {/* Onboarding banner */}
        {showOnboardingBanner && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
            <Sparkles className="h-5 w-5 text-primary shrink-0" />
            <span className="text-foreground">
              <strong>Get personalized recommendations!</strong> Complete your onboarding to see opportunities matched to your profile.
            </span>
            <Link to="/onboarding" className="ml-auto shrink-0">
              <Button size="sm" className="gradient-primary text-primary-foreground rounded-full">Start Onboarding</Button>
            </Link>
          </div>
        )}

        {/* Profile completion banner */}
        {showProfileBanner && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 text-sm">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-800 dark:text-amber-200">
              <strong>Add your skills</strong> to get personalized recommendations.
            </span>
            <Link to="/student/profile" className="ml-auto shrink-0">
              <Button size="sm" variant="outline" className="rounded-full border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40">
                <UserIcon className="mr-1 h-3 w-3" /> Update Profile
              </Button>
            </Link>
          </div>
        )}

        {/* Recommended for You section */}
        {isStudent && hasCompletedOnboarding && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Recommended for You</h2>
              {!recState.loading && visibleRecommendations.length > 0 && (
                <span className="text-sm font-medium text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full">
                  {visibleRecommendations.length} match{visibleRecommendations.length !== 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {recState.loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-80 rounded-[1rem] bg-accent/50 animate-pulse border border-border" />
                ))}
              </div>
            ) : visibleRecommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleRecommendations.map((opp: RecommendedOpportunity) => (
                  <OpportunityCard key={String(opp._id || opp.id)} opportunity={opp as Opportunity} />
                ))}
              </div>
            ) : !recState.needsProfileCompletion && !recState.needsOnboarding && !recState.error ? (
              <div className="text-center py-10 bg-accent/10 rounded-[1rem] border border-border/50">
                <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No recommendations yet. Apply to more opportunities to improve your matches.</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Section 2: Opportunities You Interacted With */}
        {isStudent && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold">Opportunities You Interacted With</h2>
              <span className="text-sm font-medium text-muted-foreground bg-primary/10 px-2 py-0.5 rounded-full" aria-label={`${interactedOpportunities.length} interacted opportunities`}>
                {interactedOpportunities.length} interacted
              </span>
            </div>
            {interactedOpportunities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                {interactedOpportunities.map(opp => (
                  <OpportunityCard key={opp._id || opp.id} opportunity={opp} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-accent/10 rounded-[1rem] border border-border/50 max-w-2xl mx-auto space-y-2 animate-fade-in">
                <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold text-foreground">You haven't interacted with any opportunities yet.</p>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">Explore custom recommendations above or browse the feed below to start making a real-world impact.</p>
              </div>
            )}
          </div>
        )}

        {/* All Opportunities */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">
              {visibleBrowseOpportunities.length} {visibleBrowseOpportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Found
            </h2>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={paidFilter} onValueChange={setPaidFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Compensation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="paid">Stipend / Paid</SelectItem>
                  <SelectItem value="unpaid">Volunteer / Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 rounded-[1rem] bg-accent/50 animate-pulse border border-border"></div>
              ))}
            </div>
          ) : visibleBrowseOpportunities.length === 0 ? (
            <div className="text-center py-24 bg-accent/20 rounded-[1rem] border border-border/50">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No opportunities found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
              <Button variant="outline" className="mt-6" onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setModeFilter('all');
                setPaidFilter('all');
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleBrowseOpportunities.map(opp => (
                <OpportunityCard key={opp._id || opp.id} opportunity={opp} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
