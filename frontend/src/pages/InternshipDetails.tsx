import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { opportunityService, applicationService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Briefcase, MapPin, Clock, Users, ArrowLeft, Send, Sparkles, AlertCircle } from 'lucide-react';
import { Opportunity } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';

export default function InternshipDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoError(false);
  }, [opportunity]);

  useEffect(() => {
    if (id) {
      opportunityService.getById(id)
        .then(res => setOpportunity(res.data))
        .catch(err => {
          toast.error(err.message || 'Failed to load opportunity details');
          navigate('/internships');
        })
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  const handleApply = async () => {
    if (!user) {
      toast.error('Please login to apply');
      return navigate('/login');
    }
    if (user.role !== 'student') {
      return toast.error('Only volunteers can apply to opportunities');
    }

    // Check if the opportunity requires an assessment
    if (opportunity?.exam && opportunity.exam.questions && opportunity.exam.questions.length > 0) {
      return navigate(`/exam/${opportunity._id || opportunity.id}`);
    }

    setApplying(true);
    try {
      await applicationService.apply(id!, {});
      toast.success('Successfully applied!');
      navigate('/student/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  // Return the backend computed match score, do not generate client-side mock percentages
  const getMatchScore = () => {
    if (opportunity && opportunity.matchScore !== undefined && opportunity.matchScore !== null) {
      return opportunity.matchScore;
    }
    return null;
  };

  const matchScore = getMatchScore();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AppLayout>
    );
  }

  if (!opportunity) return null;

  return (
    <AppLayout>
      <div className="bg-primary/5 border-b border-border/50 py-12 animate-fade-in">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 -ml-4 text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to opportunities
          </Button>

          <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
            <div className="flex gap-6 items-start">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-card flex items-center justify-center shrink-0 border border-border shadow-sm overflow-hidden">
                {getImageUrl((opportunity as any).companyId?.logo || opportunity.companyLogo) && !logoError ? (
                  <img
                    src={getImageUrl((opportunity as any).companyId?.logo || opportunity.companyLogo)}
                    alt={opportunity.companyName}
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <Briefcase className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{opportunity.title}</h1>
                <p className="text-xl text-muted-foreground">{opportunity.companyName}</p>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                    {opportunity.category || 'Frontend Development'}
                  </Badge>
                  <Badge variant="outline">{opportunity.mode}</Badge>
                  {opportunity.exam?.questions?.length ? (
                    <Badge variant="outline" className="border-purple-200 text-purple-600 bg-purple-50">
                      Assessment Required
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            {user?.role !== 'company' && user?.role !== 'admin' && (
              <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-3 mt-4 md:mt-0">
                {matchScore && (
                  <div className="flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                    <Sparkles className="h-5 w-5" />
                    {matchScore}% Personality Match
                  </div>
                )}
                <Button 
                  size="lg" 
                  onClick={handleApply} 
                  disabled={applying}
                  className="w-full md:w-auto gradient-primary text-primary-foreground h-14 px-8 rounded-full shadow-xl hover:shadow-primary/40 transition-shadow text-lg"
                >
                  {applying ? 'Applying...' : opportunity.exam?.questions?.length ? 'Start Assessment' : 'Apply Now'}
                  <Send className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section className="animate-slide-up">
              <h2 className="text-2xl font-bold mb-4">About the Opportunity</h2>
              <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {opportunity.description}
              </div>
            </section>

            {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-2xl font-bold mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {opportunity.requiredSkills.map(skill => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1.5 text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
            
            {opportunity.exam?.questions?.length ? (
              <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 flex gap-4">
                  <div className="mt-1">
                    <AlertCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300 mb-2">Assessment Required</h3>
                    <p className="text-purple-700 dark:text-purple-400/80 mb-4">
                      This organization requires candidates to complete a short skills assessment. 
                      You will have {opportunity.exam.duration} minutes to complete {opportunity.exam.questions.length} questions.
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="card-premium animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Location</p>
                    <p>{opportunity.location || opportunity.city || 'Remote'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Volunteer Hours</p>
                    <p>{(opportunity as any).volunteerHours > 0 ? `${(opportunity as any).volunteerHours} Hours` : (opportunity as any).duration}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-muted-foreground">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Compensation</p>
                    <p>
                      {opportunity.isPaid 
                        ? `$${opportunity.salaryMin} - $${opportunity.salaryMax} /mo` 
                        : 'Unpaid / Volunteer'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Openings</p>
                    <p>{opportunity.seatsAvailable || 5} spots</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Application Deadline</p>
                  <p className="font-semibold text-destructive">
                    {new Date(opportunity.applicationDeadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
