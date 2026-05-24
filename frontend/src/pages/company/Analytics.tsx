import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuthStore } from '@/store/authStore';
import { opportunityService, applicationService } from '@/services/api';
import type { CompanyProfile, Opportunity, Application } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart2, TrendingUp, Users, Star } from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#7C3AED', '#A855F7', '#C084FC', '#E9D5FF'];

export default function CompanyAnalytics() {
  const user = useAuthStore(s => s.user) as CompanyProfile;
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'company') return;

    Promise.all([
      opportunityService.getAll({ companyId: user.id || user._id }),
      applicationService.getCompanyApplications()
    ])
    .then(([oppRes, appRes]) => {
      setOpportunities(oppRes.data);
      setApplications(appRes.data);
    })
    .catch(() => toast.error('Failed to load analytics'))
    .finally(() => setLoading(false));
  }, [user]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AppLayout>
    );
  }

  const applicationsByStatus = [
    { name: 'Accepted', value: applications.filter(a => a.status === 'accepted').length },
    { name: 'Pending', value: applications.filter(a => a.status === 'pending').length },
    { name: 'Rejected', value: applications.filter(a => a.status === 'rejected').length },
  ];

  const applicationsPerOpp = opportunities.map(opp => ({
    name: opp.title.length > 15 ? opp.title.substring(0, 15) + '...' : opp.title,
    applicants: applications.filter(a => a.internshipId === (opp._id || opp.id)).length,
  })).slice(0, 5); // top 5

  const validAppsForAvg = applications.filter(a => a.matchScoreAtApply !== undefined && a.matchScoreAtApply !== null);
  const averageSkillMatch = validAppsForAvg.length > 0 
    ? Math.round(validAppsForAvg.reduce((acc, curr) => acc + (curr.matchScoreAtApply || 0), 0) / validAppsForAvg.length)
    : null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in py-8 px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Analytics</h1>
          <p className="text-muted-foreground mt-1">Insights into your volunteering opportunities and candidates.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="card-premium border-primary/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Opportunities</CardTitle>
              <BarChart2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold gradient-primary-text">{opportunities.length}</div>
            </CardContent>
          </Card>
          <Card className="card-premium">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Applicants</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>
          <Card className="card-premium border-success/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Acceptance Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {applications.length ? Math.round((applicationsByStatus[0].value / applications.length) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
          <Card className="card-premium border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Candidate Match</CardTitle>
              <Star className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {averageSkillMatch !== null ? `${averageSkillMatch}%` : 'Match unavailable'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="card-premium">
            <CardHeader>
              <CardTitle>Applicants per Opportunity (Top 5)</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {opportunities.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={applicationsPerOpp}>
                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{fill: 'rgba(124, 58, 237, 0.05)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="applicants" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader>
              <CardTitle>Application Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {applications.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={applicationsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {applicationsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
