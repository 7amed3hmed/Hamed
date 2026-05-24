import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationService, opportunityService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { AlertCircle, Clock, Send, ShieldCheck } from 'lucide-react';
import { Opportunity } from '@/types';

export default function ExamPage() {
  const { internshipId } = useParams<{ internshipId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    if (internshipId) {
      opportunityService.getById(internshipId)
        .then(res => {
          const opp = res.data;
          if (opp.hasApplied) {
            toast.error('You have already applied to this opportunity.');
            navigate('/internships');
            return;
          }
          if (!opp.exam || !opp.exam.questions || opp.exam.questions.length === 0) {
            toast.error('This opportunity does not require an assessment.');
            navigate('/internships');
            return;
          }
          setOpportunity(opp);
          setTimeLeft(opp.exam.duration * 60); // minutes to seconds
        })
        .catch(err => {
          toast.error(err.message || 'Failed to load opportunity');
          navigate('/internships');
        })
        .finally(() => setLoading(false));
    }
  }, [internshipId, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!opportunity || submitting) return;
    setSubmitting(true);

    // Convert from { questionId: answerIndex } object to the format our backend expects
    // The backend at POST /internships/:id/apply accepts { answers: object }
    // where answers is a map of questionId -> selected choice index
    const answersObj: Record<string, number> = {};
    Object.entries(answers).forEach(([qId, answerIdx]) => {
      answersObj[qId] = answerIdx;
    });

    try {
      await applicationService.submitExamAndApply(opportunity._id || opportunity.id!, { answers: answersObj });
      toast.success('Assessment submitted and application complete!');
      navigate('/student/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit assessment');
      setSubmitting(false);
    }
  }, [opportunity, submitting, answers, navigate]);

  useEffect(() => {
    if (started && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (started && timeLeft === 0 && !submitting) {
      handleSubmit(); // Auto-submit when time is up
    }
  }, [started, timeLeft, submitting, handleSubmit]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AppLayout>
    );
  }

  if (!opportunity || !opportunity.exam) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isComplete = Object.keys(answers).length === opportunity.exam.questions.length;

  if (!started) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-20 px-4 animate-fade-in">
          <Card className="card-premium border-purple-200">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="h-10 w-10 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Technical Assessment</h1>
                <p className="text-muted-foreground text-lg">
                  {opportunity.companyName} requires a skills assessment for the <b>{opportunity.title}</b> role.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-6 border-y border-border/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">{opportunity.exam.duration} Minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  <span className="font-medium">{opportunity.exam.questions.length} Questions</span>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-xl text-sm text-left max-w-xl mx-auto space-y-2">
                <p><b>Instructions:</b></p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Once you start, the timer will not pause.</li>
                  <li>You must answer all questions.</li>
                  <li>The assessment will auto-submit when the timer runs out.</li>
                </ul>
              </div>

              <Button 
                size="lg" 
                onClick={() => setStarted(true)} 
                className="gradient-primary text-primary-foreground h-14 px-12 rounded-full text-lg shadow-xl hover:shadow-primary/40 transition-shadow mt-4"
              >
                Start Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header with Timer */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary hidden sm:block" />
            <div>
              <h2 className="font-bold text-foreground leading-tight line-clamp-1">{opportunity.title}</h2>
              <p className="text-xs text-muted-foreground">Technical Assessment</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold ${timeLeft < 60 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8 pb-32">
        {opportunity.exam.questions.map((q, idx) => (
          <Card key={q.id || `q-${idx}`} className={`card-premium transition-colors ${answers[q.id || `q-${idx}`] !== undefined ? 'border-primary/20 bg-primary/5' : ''}`}>
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-bold shrink-0">
                  {idx + 1}
                </div>
                <h3 className="text-lg font-medium pt-1 leading-snug">{q.question}</h3>
              </div>

              <div className="space-y-3 pl-12">
                {q.choices.map((choice, cIdx) => {
                  const qId = q.id || `q-${idx}`;
                  const isSelected = answers[qId] === cIdx;
                  
                  return (
                    <label 
                      key={cIdx} 
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-white dark:bg-black shadow-sm ring-1 ring-primary/20' 
                          : 'border-border/50 hover:bg-accent/50 hover:border-primary/30'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name={`q-${qId}`} 
                        checked={isSelected}
                        onChange={() => setAnswers(prev => ({ ...prev, [qId]: cIdx }))}
                        className="w-5 h-5 text-primary border-muted-foreground focus:ring-primary focus:ring-offset-background accent-primary"
                      />
                      <span className={`${isSelected ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {choice}
                      </span>
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border/50 z-40">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="text-sm font-medium">
              <span className={isComplete ? 'text-success' : 'text-muted-foreground'}>
                {Object.keys(answers).length} of {opportunity.exam.questions.length} answered
              </span>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={!isComplete || submitting}
              className="gradient-primary text-primary-foreground h-12 px-8 rounded-full shadow-lg hover:shadow-primary/30 transition-all"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'} <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
