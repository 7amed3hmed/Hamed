import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { opportunityService, applicationService } from '@/services/api';
import { Briefcase, Users, Plus, ArrowRight, BarChart2, Star, RefreshCw, Trash2, Edit, Eye, Settings2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Opportunity, Application } from '@/types';
import { toast } from 'sonner';

export default function CompanyDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Stable identity keys — avoid object reference changes triggering re-renders
  const userId = (user as any)?.id || (user as any)?._id;
  const userRole = user?.role;
  const isApproved = (user as any)?.isApproved;

  const loadDashboard = useCallback(async () => {
    if (userRole !== 'company') return;
    if (!isApproved) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // getMyOpportunities uses /internships/mine — returns ALL statuses for this company
      const [oppRes, appRes] = await Promise.all([
        opportunityService.getMyOpportunities(),
        applicationService.getCompanyApplications(),
      ]);
      const sortedApps = (appRes.data ?? []).sort((a: any, b: any) => {
        const scoreA = a.matchScoreAtApply !== undefined && a.matchScoreAtApply !== null ? a.matchScoreAtApply : -1;
        const scoreB = b.matchScoreAtApply !== undefined && b.matchScoreAtApply !== null ? b.matchScoreAtApply : -1;
        return scoreB - scoreA;
      });
      setOpportunities(oppRes.data ?? []);
      setApplications(sortedApps);
    } catch (err: any) {
      console.error('[CompanyDashboard] Failed to load:', err);
      toast.error(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole, isApproved]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const id = (deleteTarget._id || deleteTarget.id)!;
      await opportunityService.delete(id);
      toast.success('Opportunity deleted successfully');
      setDeleteTarget(null);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Reload on mount AND whenever we navigate back to this page
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, location.key]);

  if (!isApproved) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto py-20 text-center animate-fade-in">
          <div className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Briefcase className="h-10 w-10 text-warning" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Account Pending Approval</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Your organization profile is currently being reviewed by our administrators.
            You will be able to post volunteering opportunities once approved.
          </p>
        </div>
      </AppLayout>
    );
  }

  const activeOpps = opportunities.filter(
    (o) => o.status === 'approved' && new Date(o.applicationDeadline) > new Date()
  );

  // Average match score based on real snapshot match score data
  const validAppsForAvg = applications.filter(
    (a) => a.matchScoreAtApply !== undefined && a.matchScoreAtApply !== null
  );
  const avgMatch =
    validAppsForAvg.length > 0
      ? Math.round(
          validAppsForAvg.reduce((sum, a) => sum + (a.matchScoreAtApply ?? 0), 0) /
            validAppsForAvg.length
        )
      : null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in py-8 px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-primary/5 p-6 sm:p-8 rounded-[2rem] border border-primary/10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Organization Dashboard</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your volunteering opportunities and discover passionate candidates.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDashboard}
              disabled={loading}
              className="rounded-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Link to="/company/internships/create">
              <Button className="gradient-primary text-primary-foreground rounded-full shadow-md">
                <Plus className="mr-2 h-4 w-4" /> Post Opportunity
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card className="card-hover border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Opportunities</CardTitle>
              <Briefcase className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold gradient-primary-text">{loading ? '-' : activeOpps.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Out of {opportunities.length} total</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '-' : applications.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all opportunities</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-success/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
              <BarChart2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {loading ? '-' : applications.filter((a) => a.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Require your attention</p>
            </CardContent>
          </Card>

          <Card className="card-hover border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Match Score</CardTitle>
              <Star className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {loading ? '-' : avgMatch !== null ? `${avgMatch}%` : 'Match unavailable'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Skill compatibility average</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Opportunities Management Center */}
          <Card className="card-premium md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                <CardTitle>Manage Opportunities</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/company/internships')}
                className="text-primary hover:text-primary/80"
              >
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : opportunities.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">No opportunities posted yet.</p>
                  <Button
                    onClick={() => navigate('/company/internships/create')}
                    variant="outline"
                    className="rounded-full"
                  >
                    Post your first opportunity
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {opportunities.map((opp) => {
                    const oppId = (opp._id ?? opp.id ?? '').toString();
                    // Count applicants
                    const count = applications.filter(
                      (a) => (a.internshipId ?? '').toString() === oppId
                    ).length;

                    return (
                      <div
                        key={oppId}
                        className="p-4 hover:bg-accent/30 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{opp.title}</h4>
                          <div className="flex flex-wrap gap-2 items-center mt-1">
                            <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                              {opp.category || 'Frontend Development'}
                            </span>
                            <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                              {opp.mode}
                            </span>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                opp.status === 'approved'
                                  ? 'bg-success/10 text-success'
                                  : opp.status === 'rejected'
                                  ? 'bg-destructive/10 text-destructive'
                                  : 'bg-warning/10 text-warning-foreground'
                              }`}
                            >
                              {opp.status === 'approved'
                                ? 'Published'
                                : opp.status === 'rejected'
                                ? 'Rejected'
                                : 'Pending Approval'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <div className="text-center mr-2 px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="text-sm font-bold text-primary">{count}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Applicants</div>
                          </div>

                          {opp.status === 'approved' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => navigate(`/company/internships/${oppId}/applicants`)}
                              className="gap-1.5 h-8 text-xs font-medium"
                            >
                              <Users className="h-3.5 w-3.5" /> Manage Applicants
                            </Button>
                          )}
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/internships/${oppId}`)}
                            className="gap-1.5 h-8 text-xs font-medium"
                            title="View Public Details"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>

                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/company/internships/${oppId}/edit`)}
                            className="gap-1.5 h-8 text-xs font-medium"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteTarget(opp)}
                            title="Delete Opportunity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Applicants */}
          <Card className="card-premium md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/50">
              <CardTitle>Recent Applicants</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const firstApproved = opportunities.find((o) => o.status === 'approved');
                  if (firstApproved) {
                    navigate(
                      `/company/internships/${(firstApproved._id ?? firstApproved.id)}/applicants`
                    );
                  } else {
                    navigate('/company/internships');
                  }
                }}
                className="text-primary hover:text-primary/80"
              >
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
              ) : applications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No applications received yet.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {applications.slice(0, 4).map((app) => (
                    <div
                      key={app._id ?? app.id}
                      className="p-4 hover:bg-accent/30 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-semibold">{app.studentName}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {app.internshipTitle}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md inline-block">
                          {app.matchScoreAtApply !== undefined && app.matchScoreAtApply !== null
                            ? `${app.matchScoreAtApply}% Match`
                            : 'Match unavailable'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>Delete Opportunity</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? All applicant data will also be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  );
}
