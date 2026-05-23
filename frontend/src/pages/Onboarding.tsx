import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { onboardingService } from '@/services/api';
import { SOFT_SKILLS_QUESTIONS, PERSONALITY_QUESTIONS, INTEREST_CATEGORIES, SKILL_OPTIONS, OnboardingQuestion, StudentProfile } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, ArrowRight, Sparkles, ChevronLeft } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, completeOnboardingState } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    username: (user as StudentProfile)?.username || '',
    phone: '',
    gender: 'other',
    availability: 'flexible',
    interests: [] as string[],
    skills: [] as string[],
    experienceYears: 0,
  });

  // Step 2 & 3: Assessments
  const [softSkillsAnswers, setSoftSkillsAnswers] = useState<Record<string, number>>({});
  const [personalityAnswers, setPersonalityAnswers] = useState<Record<string, number>>({});

  const toggleInterest = (id: string) => {
    setBasicInfo(prev => ({
      ...prev,
      interests: prev.interests.includes(id) 
        ? prev.interests.filter(i => i !== id)
        : [...prev.interests, id]
    }));
  };

  const toggleSkill = (skill: string) => {
    setBasicInfo(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleStep1Submit = async () => {
    if (!basicInfo.username || basicInfo.interests.length === 0) {
      toast.error('Please enter your name and select at least one interest.');
      return;
    }
    if (basicInfo.skills.length === 0) {
      toast.error('Please select at least one technical skill.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onboardingService.saveBasicInfo(basicInfo);
      setStep(2);
      window.scrollTo(0, 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save basic info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = async () => {
    if (Object.keys(softSkillsAnswers).length < SOFT_SKILLS_QUESTIONS.length) {
      toast.error('Please answer all soft skills questions.');
      return;
    }
    setIsSubmitting(true);
    try {
      const responses = Object.entries(softSkillsAnswers).map(([id, score]) => {
        const q = SOFT_SKILLS_QUESTIONS.find(sq => sq.id === id)!;
        return { questionId: id, question: q.text, category: q.category, score };
      });
      await onboardingService.saveSoftSkills(responses);
      setStep(3);
      window.scrollTo(0, 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save soft skills');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep3Submit = async () => {
    if (Object.keys(personalityAnswers).length < PERSONALITY_QUESTIONS.length) {
      toast.error('Please answer all personality questions.');
      return;
    }
    setIsSubmitting(true);
    try {
      const responses = Object.entries(personalityAnswers).map(([id, score]) => {
        const q = PERSONALITY_QUESTIONS.find(pq => pq.id === id)!;
        return { questionId: id, question: q.text, category: q.category, score };
      });
      await onboardingService.savePersonality(responses);
      setStep(4);
      window.scrollTo(0, 0);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save personality');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onboardingService.complete();
      completeOnboardingState();
      toast.success('Onboarding complete! Welcome to the ecosystem.');
      navigate('/student/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic radar chart data — computed directly from real onboarding answers.
  // No hardcoded values, no inflation, no smoothing, no minimum floor.
  const radarData = useMemo(() => {
    // These two questions are reverse-worded:
    //   ss3 = "You avoid leadership roles" → high agreement means LOW leadership
    //   ss7 = "You find networking with strangers difficult" → high agreement means LOW networking
    // All other questions: high agreement = high trait level (raw score used as-is).
    const REVERSE_IDS = new Set(['ss3', 'ss7']);

    // Merge both answer maps and all question definitions into a single pass.
    const allQuestions = [...PERSONALITY_QUESTIONS, ...SOFT_SKILLS_QUESTIONS];
    const allAnswers: Record<string, number> = { ...personalityAnswers, ...softSkillsAnswers };

    // Accumulate effective scores per trait category.
    const traitAccumulator: Record<string, { sum: number; count: number }> = {};

    for (const q of allQuestions) {
      const raw = allAnswers[q.id];
      if (raw === undefined) continue; // skip unanswered questions — no default inflation

      // Apply reverse scoring where the question is negatively worded.
      const effective = REVERSE_IDS.has(q.id) ? (6 - raw) : raw;

      if (!traitAccumulator[q.category]) {
        traitAccumulator[q.category] = { sum: 0, count: 0 };
      }
      traitAccumulator[q.category].sum += effective;
      traitAccumulator[q.category].count += 1;
    }

    // Convert to chart format.
    // Scale: (avg / 5) * 100  →  1 → 20,  2 → 40,  3 → 60,  4 → 80,  5 → 100
    // No Math.max(), no offset, no clamping — low answers will produce low chart values.
    return Object.entries(traitAccumulator).map(([subject, { sum, count }]) => ({
      subject,
      A: Math.round((sum / count / 5) * 100),
      fullMark: 100,
    }));
  }, [personalityAnswers, softSkillsAnswers]);

  const renderAssessment = (
    title: string,
    description: string,
    questions: OnboardingQuestion[],
    answers: Record<string, number>,
    setAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>,
    onNext: () => void,
    onBack: () => void
  ) => (
    <div className="space-y-8 animate-slide-up">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="assessment-card p-6">
            <h3 className="text-lg font-medium mb-6 text-center">{i + 1}. {q.text}</h3>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-2xl mx-auto">
              <span className="text-sm font-semibold text-muted-foreground hidden sm:block w-20 text-right">Disagree</span>
              <div className="flex items-center justify-center gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5].map(score => (
                  <button
                    key={score}
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: score }))}
                    className={`rating-circle ${answers[q.id] === score ? 'selected' : ''}`}
                    style={{
                      width: score === 3 ? '2rem' : (score === 1 || score === 5) ? '3rem' : '2.5rem',
                      height: score === 3 ? '2rem' : (score === 1 || score === 5) ? '3rem' : '2.5rem',
                    }}
                  >
                    {answers[q.id] === score && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold text-muted-foreground hidden sm:block w-20 text-left">Agree</span>
              <div className="flex sm:hidden w-full justify-between mt-2 px-2">
                <span className="text-xs font-semibold text-muted-foreground">Disagree</span>
                <span className="text-xs font-semibold text-muted-foreground">Agree</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-border">
        <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onNext} className="gradient-primary text-primary-foreground h-12 px-8 rounded-full shadow-md" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Progress Bar */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50 py-4">
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted -z-10 rounded-full"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 gradient-primary -z-10 rounded-full transition-all duration-500" 
                 style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`step-indicator ${step === s ? 'step-active' : step > s ? 'step-complete' : 'step-inactive'}`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs font-medium text-muted-foreground mt-2">
            <span>Basic Info</span>
            <span>Soft Skills</span>
            <span>Personality</span>
            <span>Finish</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-12">
        {step === 1 && (
          <div className="space-y-8 animate-slide-up">
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-extrabold tracking-tight">Welcome to the Ecosystem</h1>
              <p className="text-lg text-muted-foreground max-w-lg mx-auto">Let's start by getting to know you. This helps us find the best volunteering opportunities for your lifestyle.</p>
            </div>

            <Card className="card-premium">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="text-base">Full Name</Label>
                  <Input value={basicInfo.username} onChange={e => setBasicInfo({ ...basicInfo, username: e.target.value })} placeholder="John Doe" className="h-12 bg-muted/50" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-base">Phone (Optional)</Label>
                    <Input value={basicInfo.phone} onChange={e => setBasicInfo({ ...basicInfo, phone: e.target.value })} placeholder="+1 (555) 000-0000" className="h-12 bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-base">Availability</Label>
                    <Select value={basicInfo.availability} onValueChange={v => setBasicInfo({ ...basicInfo, availability: v })}>
                      <SelectTrigger className="h-12 bg-muted/50"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="weekdays">Weekdays</SelectItem>
                        <SelectItem value="weekends">Weekends</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/50">
                  <Label className="text-base">What development areas are you interested in? (Select multiple)</Label>
                  <div className="flex flex-wrap gap-3">
                    {INTEREST_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => toggleInterest(cat.id)}
                        className={`interest-pill ${basicInfo.interests.includes(cat.id) ? 'selected' : ''}`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border/50">
                  <Label className="text-base">What programming languages or technologies do you know? <span className="text-destructive">*</span></Label>
                  <div className="flex flex-wrap gap-3">
                    {SKILL_OPTIONS.map(skill => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`interest-pill ${basicInfo.skills.includes(skill) ? 'selected' : ''}`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                  {basicInfo.skills.length === 0 && (
                    <p className="text-xs text-muted-foreground">Select at least one skill to continue.</p>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Label className="text-base">How many years of experience do you have in your field?</Label>
                  <Select value={String(basicInfo.experienceYears)} onValueChange={v => setBasicInfo({ ...basicInfo, experienceYears: Number(v) })}>
                    <SelectTrigger className="h-12 bg-muted/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Less than 1 year</SelectItem>
                      <SelectItem value="1">1 year</SelectItem>
                      <SelectItem value="2">2 years</SelectItem>
                      <SelectItem value="3">3 years</SelectItem>
                      <SelectItem value="5">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleStep1Submit} className="gradient-primary text-primary-foreground h-12 px-8 rounded-full shadow-md" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Continue'} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && renderAssessment(
          "Soft Skills Assessment",
          "There are no wrong answers. Respond naturally to help us match you with the right team dynamic.",
          SOFT_SKILLS_QUESTIONS,
          softSkillsAnswers,
          setSoftSkillsAnswers,
          handleStep2Submit,
          () => setStep(1)
        )}

        {step === 3 && renderAssessment(
          "Personality Assessment",
          "Almost there! These final questions help us map your personality to organizational cultures.",
          PERSONALITY_QUESTIONS,
          personalityAnswers,
          setPersonalityAnswers,
          handleStep3Submit,
          () => setStep(2)
        )}

        {step === 4 && (
          <div className="space-y-8 animate-slide-up text-center pt-8">
            <div className="w-20 h-20 mx-auto rounded-full gradient-primary flex items-center justify-center shadow-xl shadow-primary/30 mb-6">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Profile Analyzed!</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              We've mapped your personality and soft skills. You're now ready to discover highly compatible volunteering opportunities.
            </p>

            <Card className="card-premium max-w-md mx-auto mt-8">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2 text-center">Your Personality Matrix Preview</h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="You" dataKey="A" stroke="#7C3AED" fill="#A855F7" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleFinalSubmit} className="gradient-primary text-primary-foreground h-14 px-12 rounded-full text-lg shadow-xl hover:shadow-primary/40 transition-shadow mt-8" disabled={isSubmitting}>
              {isSubmitting ? 'Finishing...' : 'Enter the Ecosystem'} <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
