import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useInternshipStore } from '@/store/internshipStore';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Clock, CheckCircle, XCircle, ArrowRight, User as UserIcon, Sparkles } from 'lucide-react';
import { StudentProfile } from '@/types';
import { recommendationService } from '@/services/api';

// Shape of a recommended opportunity from /api/recommendations/me
interface RecommendedOpp {
  _id: string;
  title: string;
  companyName: string;
  matchScore?: number | null;
  techScore?: number | null;
  category?: string;
  requiredSkills?: string[];
}

interface RecState {
  loading: boolean;
  recommendations: RecommendedOpp[];
  needsProfileCompletion: boolean;
  error: boolean;
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { applications, fetchMyApplications, isLoading } = useInternshipStore();
  const navigate = useNavigate();

  const [recState, setRecState] = useState<RecState>({
    loading: false,
    recommendations: [],
    needsProfileCompletion: false,
    error: false,
  });

  useEffect(() => {
    fetchMyApplications();
  }, [fetchMyApplications]);

  const student = user as StudentProfile | null;
  const isStudent = student?.role === 'student';
  const hasCompletedOnboarding = student?.hasCompletedOnboarding ?? false;

  // Fetch recommendations once on mount — same source as Browse Recommended for You
  useEffect(() => {
    if (!isStudent || !hasCompletedOnboarding) return;

    setRecState(prev => ({ ...prev, loading: true, error: false }));

    recommendationService.getMyRecommendations()
      .then(res => {
        // Safe parsing — api.ts interceptor may already unwrap { success, data } → data
        // So we support both shapes robustly.
        const responseData = (res as any)?.data ?? res;

        const recommendations: RecommendedOpp[] =
          Array.isArray(responseData?.recommendations)
            ? responseData.recommendations
            : Array.isArray(responseData?.data?.recommendations)
              ? responseData.data.recommendations
              : [];

        const needsProfileCompletion =
          typeof responseData?.needsProfileCompletion === 'boolean'
            ? responseData.needsProfileCompletion
            : !!responseData?.data?.needsProfileCompletion;

        setRecState({ loading: false, recommendations, needsProfileCompletion, error: false });
      })
      .catch(() => {
        setRecState(prev => ({ ...prev, loading: false, error: true }));
      });
  }, [isStudent, hasCompletedOnboarding]);

  // Lookup map: all possible IDs from each recommendation → matchScore from Python via API
  // Uses flatMap so that rec._id, rec.id, rec.opportunityId, rec.internshipId
  // are all valid keys — handles whatever shape the backend returns.
  // Never generates a score locally.
  const recScoreById = new Map<string, number | null | undefined>(
    recState.recommendations.flatMap((rec) => {
      const ids = [
        rec._id,
        (rec as any).id,
        (rec as any).opportunityId,
        (rec as any).internshipId,
      ].filter(Boolean);
      return ids.map((id) => [String(id), rec.matchScore]);
    })
  );

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    accepted: applications.filter(a => a.status === 'accepted').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Clock className="h-5 w-5 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-success/10 text-success hover:bg-success/20';
      case 'rejected': return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      default: return 'bg-warning/10 text-warning-foreground hover:bg-warning/20';
    }
  };

  // Derive top personality trait if available
  const topTrait = student?.personalityAssessment?.reduce((prev, current) =>
    (prev.score > current.score) ? prev : current
  , { category: 'Empathy', score: 0 });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in py-8">

        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-6 sm:p-8 rounded-[2rem] border border-primary/10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome back, {student?.username}</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Ready to make an impact today?
            </p>
            {topTrait && topTrait.score > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-black/20 border border-primary/20 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Your top trait: {topTrait.category}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link to="/internships">
              <Button className="gradient-primary text-primary-foreground rounded-full shadow-md">
                Browse Opportunities
              </Button>
            </Link>
            <Link to="/student/profile">
              <Button variant="outline" className="rounded-full">
                <UserIcon className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="card-hover border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
              <Briefcase className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold gradient-primary-text">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="card-hover border-success/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.accepted}</div>
            </CardContent>
          </Card>
          <Card className="card-hover border-warning/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning-foreground">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="card-hover border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-8">

          {/* Recent Applications — match score from recommendation lookup only */}
          <Card className="md:col-span-2 card-premium">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Applications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading applications...</div>
              ) : applications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Applications Yet</h3>
                  <p className="text-muted-foreground mb-6">You haven't applied to any volunteering opportunities yet.</p>
                  <Button onClick={() => navigate('/internships')} className="gradient-primary rounded-full">
                    Start Exploring
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {applications.slice(0, 5).map(app => {
                    // Try every possible ID shape the application object may carry
                    // to match against the recommendation map.
                    // Never display app.skillMatch — it uses a different naive formula.
                    const candidateIds = [
                      app.internshipId,
                      (app as any).opportunityId,
                      (app as any).internship?._id,
                      (app as any).opportunity?._id,
                      (app as any).internship?.id,
                      (app as any).opportunity?.id,
                    ].filter(Boolean).map(String);

                    const matchScore = candidateIds.reduce<number | null | undefined>(
                      (found, id) => found ?? recScoreById.get(id),
                      undefined
                    );

                    return (
                      <div key={app._id} className="p-6 hover:bg-accent/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-lg text-foreground mb-1">{app.internshipTitle}</h4>
                          <p className="text-muted-foreground flex items-center gap-2">
                            <span>{app.companyName}</span>
                            <span>•</span>
                            <span>Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Only show badge if this opportunity is in current recommendations */}
                          {matchScore != null && (
                            <div className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {matchScore}% Match
                            </div>
                          )}
                          <Badge variant="secondary" className={`capitalize px-3 py-1 text-sm ${getStatusColor(app.status)}`}>
                            {getStatusIcon(app.status)}
                            <span className="ml-1.5">{app.status}</span>
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommended for You — connected to /api/recommendations/me */}
          <div className="space-y-6">
            <Card className="card-premium bg-gradient-to-br from-primary/5 to-accent/20 border-primary/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Recommended for You
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {recState.loading ? (
                  // Loading skeleton — 2 pulse cards
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-16 rounded-xl bg-accent/40 animate-pulse border border-border" />
                    ))}
                  </div>
                ) : recState.needsProfileCompletion ? (
                  // Profile completion prompt
                  <div className="p-4 bg-white dark:bg-black/40 rounded-xl border border-border shadow-sm text-center">
                    <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Complete your profile to get personalized recommendations.
                    </p>
                    <Button
                      size="sm"
                      className="gradient-primary text-primary-foreground rounded-full"
                      onClick={() => navigate('/onboarding')}
                    >
                      Complete Profile
                    </Button>
                  </div>
                ) : recState.recommendations.length > 0 ? (
                  // Real recommendations — top 3, scores from Python via API
                  <div className="space-y-3">
                    {recState.recommendations.slice(0, 3).map(rec => (
                      <div
                        key={String(rec._id)}
                        className="p-3 bg-white dark:bg-black/40 rounded-xl border border-border shadow-sm cursor-pointer hover:border-primary/30 transition-colors"
                        onClick={() => navigate(`/internships/${rec._id}`)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{rec.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{rec.companyName}</p>
                            {rec.requiredSkills && rec.requiredSkills.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {rec.requiredSkills.slice(0, 3).join(', ')}
                              </p>
                            )}
                          </div>
                          {rec.matchScore != null && (
                            <div className="shrink-0 text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full whitespace-nowrap">
                              {rec.matchScore}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recState.error ? (
                  // API error state
                  <div className="p-4 bg-white dark:bg-black/40 rounded-xl border border-border shadow-sm text-center">
                    <p className="text-xs text-muted-foreground">
                      Could not load recommendations. Try again later.
                    </p>
                  </div>
                ) : (
                  // Empty — no compatible recommendations
                  <div className="p-4 bg-white dark:bg-black/40 rounded-xl border border-border shadow-sm text-center">
                    <p className="text-xs text-muted-foreground">
                      No compatible recommendations yet. Update your skills or browse opportunities.
                    </p>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-between group"
                  onClick={() => navigate('/internships')}
                >
                  View all opportunities
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="text-lg">Saved Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                {student?.savedOpportunities && student.savedOpportunities.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">You have {student.savedOpportunities.length} saved opportunities.</p>
                    <Button variant="secondary" className="w-full" onClick={() => navigate('/saved')}>
                      View Saved List
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No saved opportunities yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
