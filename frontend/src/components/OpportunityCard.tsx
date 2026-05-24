import { Link } from 'react-router-dom';
import { Opportunity } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, Clock, Bookmark, Sparkles, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import { onboardingService } from '@/services/api';
import { toast } from 'sonner';
import { getImageUrl } from '@/utils/imageUrl';

interface OpportunityCardProps {
  opportunity: Opportunity;
  onSaveToggle?: () => void; // Callback to refresh saved list if needed
}

export function OpportunityCard({ opportunity, onSaveToggle }: OpportunityCardProps) {
  const { user, toggleSavedOpportunityState } = useAuthStore();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [opportunity]);

  useEffect(() => {
    if (user?.role === 'student') {
      const student = user as any;
      const oppId = opportunity.id || opportunity._id;
      setIsSaved(student.savedOpportunities?.includes(oppId) || false);
    } else {
      setIsSaved(false);
    }
  }, [user, opportunity]);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // prevent navigation
    
    if (!user) {
      toast.error('Please login as a student to bookmark opportunities', {
        description: 'Only technical volunteers can save opportunities to their profile.',
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login'
        }
      });
      return;
    }

    if (user.role !== 'student') {
      toast.error('Only students can bookmark opportunities');
      return;
    }
    
    setIsSaving(true);
    const oppId = opportunity.id || (opportunity as any)._id;

    try {
      const res = await onboardingService.toggleSave(oppId);
      // res.data contains { saved: boolean, savedOpportunities: string[] }
      setIsSaved(res.data.saved);
      
      // Update global auth store state immediately
      toggleSavedOpportunityState(oppId, res.data.savedOpportunities);
      
      toast.success(res.data.saved ? 'Opportunity bookmarked' : 'Bookmark removed');
      
      if (onSaveToggle) onSaveToggle();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update bookmark');
    } finally {
      setIsSaving(false);
    }
  };

  // Return the backend computed match score, do not generate client-side mock percentages
  const getMatchScore = () => {
    if (opportunity.matchScore !== undefined && opportunity.matchScore !== null) {
      return opportunity.matchScore;
    }
    return null;
  };

  const matchScore = getMatchScore();

  return (
    <Link to={`/internships/${opportunity.id || opportunity._id}`}>
      <Card className="card-premium group h-full flex flex-col hover:border-primary/30 transition-all cursor-pointer relative overflow-hidden">
        {/* Match score badge (top right) */}
        {matchScore !== null && matchScore !== undefined && (
          <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 z-10">
            <div className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-primary/20 shadow-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{matchScore}% Match</span>
            </div>
            {opportunity.techScore !== undefined && opportunity.techScore !== null && (
              <div className="flex gap-1">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Tech: {opportunity.techScore}%
                </span>
                {opportunity.personalityScore !== undefined && opportunity.personalityScore !== null && (
                  <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold px-1.5 py-0.5 rounded border border-purple-500/20">
                    Pers: {opportunity.personalityScore}%
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        <CardContent className="p-6 flex flex-col flex-grow">
          <div className="flex gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center shrink-0 border border-border shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
              {getImageUrl((opportunity as any).companyId?.logo || opportunity.companyLogo) && !logoError ? (
                <img
                  src={getImageUrl((opportunity as any).companyId?.logo || opportunity.companyLogo)}
                  alt={opportunity.companyName}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Briefcase className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {opportunity.title}
              </h3>
              <p className="text-sm font-medium text-muted-foreground line-clamp-1">
                {opportunity.companyName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="bg-primary/5 text-primary-foreground/70 hover:bg-primary/10 text-xs font-medium border-primary/10 text-primary">
              {opportunity.category || 'Frontend Development'}
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {opportunity.mode}
            </Badge>
            {opportunity.exam?.questions?.length ? (
              <Badge variant="outline" className="text-xs border-purple-200 text-purple-600 bg-purple-50">
                Assessment Req.
              </Badge>
            ) : null}
            {opportunity.hasApplied && (
              <Badge 
                variant="secondary" 
                className={`text-xs font-semibold border ${
                  opportunity.applicationStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400' :
                  opportunity.applicationStatus === 'rejected' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400' :
                  opportunity.applicationStatus === 'reviewing' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400' :
                  'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400'
                }`}
                aria-label={`Application Status: ${opportunity.applicationStatus || 'pending'}`}
              >
                {opportunity.applicationStatus === 'accepted' ? 'Accepted' :
                 opportunity.applicationStatus === 'rejected' ? 'Not Accepted' :
                 opportunity.applicationStatus === 'reviewing' ? 'Under Review' :
                 'Awaiting Response'}
              </Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-grow">
            {opportunity.description}
          </p>

          {opportunity.matchReason && (
            <div className="text-xs text-primary font-semibold flex items-center gap-1.5 mb-4 bg-primary/5 p-2 rounded-lg border border-primary/10">
              <Sparkles className="h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{opportunity.matchReason}</span>
            </div>
          )}

          {opportunity.hasApplied && (
            <div className={`text-xs font-medium p-2.5 rounded-lg border flex items-center gap-2 mb-4 ${
              opportunity.applicationStatus === 'accepted' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' :
              opportunity.applicationStatus === 'rejected' ? 'bg-rose-500/5 text-rose-600 border-rose-500/10' :
              opportunity.applicationStatus === 'reviewing' ? 'bg-purple-500/5 text-purple-600 border-purple-500/10' :
              'bg-sky-500/5 text-sky-600 border-sky-500/10'
            }`} aria-live="polite">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                opportunity.applicationStatus === 'accepted' ? 'bg-emerald-500' :
                opportunity.applicationStatus === 'rejected' ? 'bg-rose-500' :
                opportunity.applicationStatus === 'reviewing' ? 'bg-purple-500' :
                'bg-sky-500'
              }`} />
              <span>
                {opportunity.applicationStatus === 'accepted' ? 'You were accepted for this opportunity.' :
                 opportunity.applicationStatus === 'rejected' ? 'Application not accepted.' :
                 opportunity.applicationStatus === 'reviewing' ? 'Your application is under review.' :
                 'You already applied — awaiting company response.'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground font-medium border-t border-border/50 pt-4 mt-auto">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span>{opportunity.location || opportunity.city || 'Remote'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{(opportunity as any).volunteerHours > 0 ? `${(opportunity as any).volunteerHours} Hours` : opportunity.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UserIcon className="h-4 w-4" />
              <span>{opportunity.seatsAvailable || 5} spots</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
             <div className="text-sm font-semibold">
              {opportunity.isPaid ? (
                <span className="text-success">${opportunity.salaryMin} - ${opportunity.salaryMax} /mo</span>
              ) : (
                <span className="text-muted-foreground">Unpaid / Volunteer</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {opportunity.hasApplied && (
                <Button 
                  disabled 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 rounded-full text-xs font-semibold border-muted bg-muted/30 text-muted-foreground"
                >
                  {opportunity.applicationStatus === 'accepted' ? 'Accepted' :
                   opportunity.applicationStatus === 'rejected' ? 'Not Accepted' :
                   opportunity.applicationStatus === 'reviewing' ? 'Under Review' :
                   'Awaiting Response'}
                </Button>
              )}
              {user?.role === 'student' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={`h-8 w-8 rounded-full ${isSaved ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                  onClick={handleSaveToggle}
                  disabled={isSaving}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
