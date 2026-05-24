import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationService, opportunityService, API_BASE_URL } from '@/services/api';
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User, FileText, CheckCircle, XCircle, Clock, ArrowLeft, Star, Sparkles } from 'lucide-react';
import { getImageUrl } from '@/utils/imageUrl';
import { Application, Opportunity } from '@/types';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

function StudentAppAvatar({ src, name }: { src?: string; name: string }) {
  const [error, setError] = useState(false);
  const imageUrl = getImageUrl(src);
  if (imageUrl && !error) {
    return <img src={imageUrl} className="w-full h-full object-cover" alt={name} onError={() => setError(true)} />;
  }
  return <>{name.charAt(0).toUpperCase()}</>;
}

export default function ApplicantsView() {
  const { internshipId } = useParams<{ internshipId: string }>();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!internshipId) return;

    Promise.all([
      opportunityService.getById(internshipId),
      applicationService.getForInternship(internshipId)
    ])
    .then(([oppRes, appRes]) => {
      setOpportunity(oppRes.data);
      const sortedApps = (appRes.data || []).sort((a: any, b: any) => {
        const scoreA = a.matchScoreAtApply !== undefined && a.matchScoreAtApply !== null ? a.matchScoreAtApply : -1;
        const scoreB = b.matchScoreAtApply !== undefined && b.matchScoreAtApply !== null ? b.matchScoreAtApply : -1;
        return scoreB - scoreA;
      });
      setApplications(sortedApps);
    })
    .catch(err => {
      toast.error(err.message || 'Failed to load applicants');
      navigate('/company/internships');
    })
    .finally(() => setLoading(false));
  }, [internshipId, navigate]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedApp) return;
    setStatusUpdating(true);
    try {
      await applicationService.updateStatus(selectedApp._id || selectedApp.id, status);
      setApplications(apps => apps.map(a => 
        (a._id === selectedApp._id || a.id === selectedApp.id) ? { ...a, status: status as any } : a
      ));
      toast.success(`Application marked as ${status}`);
      setSelectedApp(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AppLayout>
    );
  }

  // Generate radar data safely
  const getRadarData = (app: Application) => {
    if (!app.personalitySnapshot || app.personalitySnapshot.length === 0) return [];
    
    // Group by category
    const grouped = app.personalitySnapshot.reduce((acc, curr) => {
      if (!acc[curr.trait]) acc[curr.trait] = { sum: 0, count: 0 };
      acc[curr.trait].sum += curr.score;
      acc[curr.trait].count += 1;
      return acc;
    }, {} as Record<string, { sum: number; count: number }>);

    return Object.entries(grouped).map(([trait, data]) => ({
      subject: trait,
      score: Math.round(((data.sum / data.count) / 5) * 100),
      fullMark: 100
    }));
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/company/internships')} className="mb-6 -ml-4 text-muted-foreground hover:text-primary">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to opportunities
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Applicants: {opportunity?.title}</h1>
          <p className="text-muted-foreground">Review candidate profiles, skill matches, and personality compatibility.</p>
        </div>

        {applications.length === 0 ? (
          <Card className="text-center py-20 bg-accent/20 border-border/50">
            <CardContent>
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No applicants yet</h3>
              <p className="text-muted-foreground">Check back later for new applications.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {applications.map(app => (
              <Card key={app._id} className="card-premium flex flex-col cursor-pointer" onClick={() => setSelectedApp(app)}>
                <CardContent className="p-6 flex flex-col h-full relative overflow-hidden">
                  
                  {/* Status Strip */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${
                    app.status === 'accepted' ? 'bg-success' : 
                    app.status === 'rejected' ? 'bg-destructive' : 
                    app.status === 'reviewing' ? 'bg-purple-500' : 'bg-warning'
                  }`}></div>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                        <StudentAppAvatar src={(app as any).studentId?.profileImage} name={app.studentName} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{app.studentName}</h3>
                        <p className="text-sm text-muted-foreground">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {app.matchScoreAtApply !== undefined && app.matchScoreAtApply !== null ? (
                    <div className="flex flex-col items-center justify-center p-3 bg-primary/5 rounded-lg mb-4">
                      <div className="text-xl font-extrabold text-primary">{app.matchScoreAtApply}% Match</div>
                      <div className="flex justify-between w-full text-xs font-semibold text-muted-foreground mt-2 px-2 border-t border-border/50 pt-2">
                        <span>Tech: {app.techScoreAtApply ?? 0}%</span>
                        <span>Pers: {app.personalityScoreAtApply ?? 0}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-4 bg-muted/30 text-muted-foreground text-sm font-medium rounded-lg mb-4">
                      Match unavailable
                    </div>
                  )}

                  {app.examScore !== undefined && opportunity?.exam?.questions && opportunity.exam.questions.length > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Assessment Score</span>
                        <span className="font-semibold">{app.examScore}%</span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${app.examScore}%` }}></div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
                    <Badge variant="outline" className={`capitalize ${
                      app.status === 'accepted' ? 'text-success border-success/30 bg-success/10' : 
                      app.status === 'rejected' ? 'text-destructive border-destructive/30 bg-destructive/10' : 
                      app.status === 'reviewing' ? 'text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800/50 dark:bg-purple-950/20' :
                      'text-warning-foreground border-warning/30 bg-warning/10'
                    }`}>
                      {app.status === 'accepted' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {app.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                      {app.status === 'reviewing' && <Clock className="h-3 w-3 mr-1 text-purple-600" />}
                      {app.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                      {app.status === 'reviewing' ? 'under review' : app.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-primary">
                      View Full Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Applicant Details Modal */}
        <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedApp && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {selectedApp.studentName}'s Profile
                    <Badge variant="outline" className={`ml-2 capitalize ${
                      selectedApp.status === 'accepted' ? 'text-success border-success/30 bg-success/10' : 
                      selectedApp.status === 'rejected' ? 'text-destructive border-destructive/30 bg-destructive/10' : 
                      selectedApp.status === 'reviewing' ? 'text-purple-600 border-purple-200 bg-purple-50 dark:text-purple-400 dark:border-purple-800/50 dark:bg-purple-950/20' :
                      'text-warning-foreground border-warning/30 bg-warning/10'
                    }`}>
                      {selectedApp.status === 'reviewing' ? 'under review' : selectedApp.status}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Applied on {new Date(selectedApp.appliedAt).toLocaleDateString()}
                  </DialogDescription>
                </DialogHeader>

                {selectedApp.matchScoreAtApply !== undefined && selectedApp.matchScoreAtApply !== null ? (
                  <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex flex-col sm:flex-row justify-around items-center gap-4 mt-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase font-semibold">Final Match</div>
                      <div className="text-3xl font-extrabold text-primary">{selectedApp.matchScoreAtApply}%</div>
                    </div>
                    <div className="h-8 w-[1px] bg-border hidden sm:block"></div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase font-semibold">Tech Match</div>
                      <div className="text-3xl font-extrabold text-primary">{selectedApp.techScoreAtApply ?? 0}%</div>
                    </div>
                    <div className="h-8 w-[1px] bg-border hidden sm:block"></div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground uppercase font-semibold">Personality Match</div>
                      <div className="text-3xl font-extrabold text-purple-600">{selectedApp.personalityScoreAtApply ?? 0}%</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 p-4 rounded-xl border border-border text-center text-muted-foreground text-sm font-medium mt-2">
                    AI recommendation scores: Match unavailable
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  {/* Left Column: Info & Skills */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Contact Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground w-16 inline-block">Email:</span> {selectedApp.studentEmail}</p>
                        <p><span className="text-muted-foreground w-16 inline-block">Phone:</span> {selectedApp.studentPhone || 'Not provided'}</p>
                      </div>
                      {selectedApp.cvUrl && (
                        <Button variant="outline" className="mt-4 w-full justify-start" onClick={() => window.open(`${API_ORIGIN}${selectedApp.cvUrl}`, '_blank')}>
                          <FileText className="mr-2 h-4 w-4 text-primary" /> View Resume
                        </Button>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-lg mb-2 flex justify-between items-center">
                        Skills 
                        {selectedApp.techScoreAtApply !== undefined && selectedApp.techScoreAtApply !== null && (
                          <span className="text-sm font-normal text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Tech Match: {selectedApp.techScoreAtApply}%
                          </span>
                        )}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedApp.skills && selectedApp.skills.length > 0 ? (
                          selectedApp.skills.map(s => (
                            <Badge key={s} variant="secondary" className={opportunity?.requiredSkills.map(rs => rs.toLowerCase()).includes(s.toLowerCase()) ? 'bg-primary/20 text-primary border-primary/20' : ''}>
                              {s}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No skills listed</p>
                        )}
                      </div>
                    </div>

                    {selectedApp.examScore !== undefined && (
                      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <h4 className="font-semibold text-lg mb-2">Assessment Results</h4>
                        <div className="flex items-center gap-4">
                          <div className="text-4xl font-bold gradient-primary-text">{selectedApp.examScore}%</div>
                          <p className="text-sm text-muted-foreground">Passed the technical assessment required for this role.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Personality & Soft Skills */}
                  <div className="space-y-6">
                    <div className="bg-accent/30 rounded-xl p-4 border border-border">
                      <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" />
                        Personality Insights
                      </h4>
                      
                      {selectedApp.personalitySnapshot && selectedApp.personalitySnapshot.length > 0 ? (
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarData(selectedApp)}>
                              <PolarGrid stroke="#e5e7eb" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar name="Applicant" dataKey="score" stroke="#7C3AED" fill="#A855F7" fillOpacity={0.4} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-center text-sm text-muted-foreground bg-white/50 rounded-lg">
                          No personality data available for this candidate.
                        </div>
                      )}
                    </div>

                    <div className="bg-accent/30 rounded-xl p-4 border border-border">
                      <h4 className="font-semibold text-lg mb-4">Soft Skills Evaluation</h4>
                      {selectedApp.softSkillsSnapshot && selectedApp.softSkillsSnapshot.length > 0 ? (
                        <div className="space-y-3">
                          {selectedApp.softSkillsSnapshot.map(skill => (
                            <div key={skill.trait} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium text-foreground">{skill.trait}</span>
                                <span className="text-muted-foreground">{skill.score}/5</span>
                              </div>
                              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${(skill.score / 5) * 100}%` }}></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-sm text-muted-foreground bg-white/50 rounded-lg">
                          No soft skills data available.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="sm:justify-between items-center border-t border-border pt-4 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Update Status:</span>
                    <Select value={selectedApp.status} onValueChange={handleUpdateStatus} disabled={statusUpdating}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="reviewing">Under Review</SelectItem>
                        <SelectItem value="accepted">Accept</SelectItem>
                        <SelectItem value="rejected">Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="secondary" onClick={() => setSelectedApp(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
