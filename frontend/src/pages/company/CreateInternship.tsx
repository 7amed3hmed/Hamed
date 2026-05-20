import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { opportunityService } from '@/services/api';
import { toast } from 'sonner';
import { Plus, X, Briefcase, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { value: 'Frontend Development', label: 'Frontend Development' },
  { value: 'Backend Development', label: 'Backend Development' },
  { value: 'Database Development', label: 'Database Development' },
];

const ROLE_TITLES: Record<string, string[]> = {
  'Frontend Development': ['HTML Developer', 'CSS Specialist', 'JavaScript Developer', 'React Developer', 'Vue.js Developer', 'UI/UX Developer'],
  'Backend Development': ['Node.js Developer', 'PHP Developer', 'Laravel Developer', 'Python Developer', 'API Developer', 'DevOps Engineer'],
  'Database Development': ['MongoDB Developer', 'MySQL Administrator', 'PostgreSQL Developer', 'Database Architect', 'Data Analyst'],
};

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  'Frontend Development': ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Tailwind CSS', 'Vue.js', 'Next.js'],
  'Backend Development': ['Node.js', 'Express', 'PHP', 'Laravel', 'Python', 'Django', 'REST APIs', 'Docker'],
  'Database Development': ['MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Mongoose', 'SQL', 'NoSQL'],
};

export default function CreateOpportunity() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    volunteerHours: 0,
    mode: '',
    city: '',
    location: '',
    category: '',
    roleTitle: '',
    seatsAvailable: 5,
    applicationDeadline: '',
    isPaid: false,
    salaryMin: '',
    salaryMax: '',
  });

  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleCategoryChange = (cat: string) => {
    update('category', cat);
    update('roleTitle', ''); // reset role title
  };

  const addSkill = (skill?: string) => {
    const s = (skill || newSkill).trim();
    if (s && !skills.includes(s)) {
      setSkills(prev => [...prev, s]);
      setNewSkill('');
    }
  };

  const removeSkill = (s: string) => setSkills(prev => prev.filter(x => x !== s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.volunteerHours || !form.mode || !form.applicationDeadline || !form.category) {
      toast.error('Please fill all required fields');
      return;
    }

    if (form.volunteerHours < 1) {
      toast.error('Volunteer hours must be a positive number');
      return;
    }
    setLoading(true);
    try {
      await opportunityService.create({
        ...form,
        requiredSkills: skills,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      });
      toast.success('Opportunity submitted for admin approval! 🎉');
      navigate('/company/internships');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create opportunity');
    } finally {
      setLoading(false);
    }
  };

  const suggestedSkills = SKILL_SUGGESTIONS[form.category] || [];
  const roleTitles = ROLE_TITLES[form.category] || [];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto py-8 animate-fade-in">
        <div className="mb-8 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Post a New Opportunity</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">All opportunities require admin approval before going live.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card className="card-premium">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Opportunity Title *</Label>
                <Input id="title" placeholder="e.g., React Frontend Developer Volunteer" value={form.title}
                  onChange={e => update('title', e.target.value)} className="rounded-xl" required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={handleCategoryChange} required>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role Title */}
                <div className="space-y-2">
                  <Label>Role Title</Label>
                  <Select value={form.roleTitle} onValueChange={v => update('roleTitle', v)} disabled={!form.category}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={form.category ? 'Select role title' : 'Select category first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleTitles.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" placeholder="Describe the opportunity, responsibilities, and expected impact..."
                  value={form.description} onChange={e => update('description', e.target.value)}
                  className="rounded-xl min-h-[120px]" required />
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card className="card-premium">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base">Logistics & Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode *</Label>
                  <Select value={form.mode} onValueChange={v => update('mode', v)} required>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="volunteerHours">Volunteer Hours *</Label>
                  <Input id="volunteerHours" type="number" min={1} placeholder="Estimated volunteer hours" value={form.volunteerHours || ''}
                    onChange={e => update('volunteerHours', Number(e.target.value))} className="rounded-xl" required />
                  <p className="text-[10px] text-muted-foreground px-1">Enter the estimated volunteer hours.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seats">Available Seats</Label>
                  <Input id="seats" type="number" min={1} value={form.seatsAvailable}
                    onChange={e => update('seatsAvailable', Number(e.target.value))} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Application Deadline *</Label>
                  <Input id="deadline" type="date" value={form.applicationDeadline}
                    onChange={e => update('applicationDeadline', e.target.value)} className="rounded-xl" required />
                </div>
              </div>

              {(form.mode === 'offline' || form.mode === 'hybrid') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="e.g., Riyadh" value={form.city}
                      onChange={e => update('city', e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location / Address</Label>
                    <Input id="location" placeholder="e.g., King Abdullah District" value={form.location}
                      onChange={e => update('location', e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="card-premium">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" /> Required Skills
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {/* Suggested pills */}
              {suggestedSkills.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Quick add:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedSkills.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addSkill(s)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                          skills.includes(s)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                        }`}
                      >
                        {skills.includes(s) ? '✓ ' : '+ '}{s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom skill input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a custom skill..."
                  value={newSkill}
                  onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="rounded-xl"
                />
                <Button type="button" variant="outline" onClick={() => addSkill()} className="rounded-xl shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Added skills */}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 text-sm bg-primary/10 text-primary px-3 py-1.5 rounded-full font-medium border border-primary/20">
                      {s}
                      <button type="button" onClick={() => removeSkill(s)} className="hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stipend */}
          <Card className="card-premium">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold">Optional Stipend</p>
                  <p className="text-sm text-muted-foreground">Does this opportunity offer a stipend or financial support?</p>
                </div>
                <Switch
                  checked={form.isPaid}
                  onCheckedChange={v => update('isPaid', v)}
                />
              </div>
              {form.isPaid && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label>Min Stipend (SAR/month)</Label>
                    <Input type="number" min={0} placeholder="e.g., 500" value={form.salaryMin}
                      onChange={e => update('salaryMin', e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Stipend (SAR/month)</Label>
                    <Input type="number" min={0} placeholder="e.g., 1500" value={form.salaryMax}
                      onChange={e => update('salaryMax', e.target.value)} className="rounded-xl" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => navigate('/company/internships')} className="rounded-full flex-1">
              Cancel
            </Button>
            <Button type="submit" className="gradient-primary text-white rounded-full flex-1 shadow-lg shadow-primary/25" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
