import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuthStore } from '@/store/authStore';
import type { StudentProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, X, Plus, Sparkles, User as UserIcon } from 'lucide-react';
import { aiService, authService, API_BASE_URL } from '@/services/api';
import { getImageUrl } from '@/utils/imageUrl';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export default function StudentProfile() {
  const { user, updateProfile, updateSkills } = useAuthStore();
  const student = user as StudentProfile;
  const [newSkill, setNewSkill] = useState('');
  const [extracting, setExtracting] = useState(false);
  
  const [formData, setFormData] = useState({
    username: student.username || '',
    phone: student.phone || '',
    gender: student.gender || 'other',
    profileImage: getImageUrl(student.profileImage)
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  useEffect(() => {
    setFormData(prev => ({ ...prev, profileImage: getImageUrl(student.profileImage) }));
  }, [student.profileImage]);

  useEffect(() => {
    setProfileImageError(false);
  }, [formData.profileImage]);

  const handleAddSkill = () => {
    if (newSkill.trim() && !student.skills.includes(newSkill.trim())) {
      const updatedSkills = [...student.skills, newSkill.trim()];
      updateSkills(updatedSkills);
      updateProfile({ skills: updatedSkills });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    const updatedSkills = student.skills.filter(s => s !== skill);
    updateSkills(updatedSkills);
    updateProfile({ skills: updatedSkills });
  };

  const handleExtractSkills = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExtracting(true);
    try {
      const res = await aiService.extractSkills(file);
      const { extractedSkills = [], cvUrl } = res.data || {};
      const newSkills = [...new Set([...student.skills, ...extractedSkills])];
      
      updateSkills(newSkills);
      await updateProfile({ skills: newSkills, extractedSkills, cvUrl } as Partial<StudentProfile>);
      
      toast.success('CV uploaded and skills extracted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract skills');
    } finally {
      setExtracting(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profileImage', file);
      const res = await authService.updateProfile(formData);
      // Backend returns updated user
      updateProfile(res.data);
      setFormData(prev => ({ ...prev, profileImage: getImageUrl(res.data.profileImage) }));
      toast.success('Profile image updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile(formData);
    toast.success('Profile updated!');
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl animate-fade-in">
        <h1 className="text-2xl font-bold">My Profile</h1>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-border/50">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-muted overflow-hidden border-2 border-violet-100 group-hover:border-violet-300 transition-colors">
                  {formData.profileImage && !profileImageError ? (
                    <img src={formData.profileImage} className="w-full h-full object-cover" alt="" onError={() => setProfileImageError(true)} />
                  ) : <UserIcon className="h-10 w-10 text-muted-foreground/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer rounded-2xl transition-opacity">
                  <Upload className="h-6 w-6" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
                {uploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">JPG, GIF or PNG. Max size of 2MB.</p>
                <Button variant="outline" size="sm" className="mt-2 h-8 text-xs rounded-full relative">
                  Upload New
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} disabled={uploadingImage} />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={student.email} disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+201234567890" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={v => setFormData({ ...formData, gender: v as 'male' | 'female' | 'other' })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="gradient-primary text-primary-foreground" onClick={handleSaveProfile}>Save Changes</Button>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>CV & AI Skill Extraction</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Upload your CV (PDF/DOC)</p>
              <Input type="file" accept=".pdf,.doc,.docx" className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto" onChange={handleExtractSkills} disabled={extracting} />
              {student.cvUrl && (
                <p className="mt-2 text-xs text-primary font-medium">✅ CV Uploaded: <a href={`${API_ORIGIN}${student.cvUrl}`} target="_blank" rel="noreferrer" className="underline hover:text-primary/80">View CV</a></p>
              )}
            </div>
            {extracting && (
              <div className="flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4 animate-spin" /> Extracting skills with AI...
              </div>
            )}
            {student.extractedSkills && student.extractedSkills.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Extracted Skills:</p>
                <div className="flex flex-wrap gap-1.5">
                  {student.extractedSkills.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={newSkill} onChange={e => setNewSkill(e.target.value)} placeholder="Add a skill"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())} />
              <Button size="icon" onClick={handleAddSkill} variant="outline"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {student.skills.map(skill => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <button onClick={() => handleRemoveSkill(skill)} className="ml-1 rounded-full hover:bg-destructive/20 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {student.hasCompletedOnboarding && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/50 bg-primary/5">
              <CardHeader><CardTitle className="text-lg">Personality Profile</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.personalityAssessment && student.personalityAssessment.length > 0 ? (
                    // Group by category and average the scores
                    Object.entries(
                      student.personalityAssessment.reduce((acc, curr) => {
                        if (!acc[curr.category]) acc[curr.category] = { sum: 0, count: 0 };
                        acc[curr.category].sum += curr.score;
                        acc[curr.category].count += 1;
                        return acc;
                      }, {} as Record<string, { sum: number; count: number }>)
                    ).map(([trait, data]) => {
                      const avg = data.sum / data.count;
                      const percentage = (avg / 5) * 100;
                      return (
                        <div key={trait} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{trait}</span>
                            <span className="text-muted-foreground">{Math.round(percentage)}%</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full gradient-primary rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No personality data available.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-primary/5">
              <CardHeader><CardTitle className="text-lg">Soft Skills Profile</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.softSkillsAssessment && student.softSkillsAssessment.length > 0 ? (
                    student.softSkillsAssessment.map((skill) => {
                      const percentage = (skill.score / 5) * 100;
                      return (
                        <div key={skill.category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{skill.category}</span>
                            <span className="text-muted-foreground">{skill.score}/5</span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-accent-foreground rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No soft skills data available.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
