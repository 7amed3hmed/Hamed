import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useAuthStore } from '@/store/authStore';
import type { CompanyProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building2, Upload, AlertCircle } from 'lucide-react';
import { getImageUrl } from '@/utils/imageUrl';

export default function CompanyProfilePage() {
  const { user, updateProfile } = useAuthStore();
  const company = user as CompanyProfile;

  const [formData, setFormData] = useState({
    companyName: company.companyName || '',
    description: company.description || '',
    website: company.website || '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    getImageUrl(company.logo)
  );
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setLogoPreview(getImageUrl(company.logo));
  }, [company.logo]);

  useEffect(() => {
    setLogoError(false);
  }, [logoPreview]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    try {
      const fd = new FormData();
      fd.append('companyName', formData.companyName);
      fd.append('description', formData.description);
      fd.append('website', formData.website);
      if (logoFile) {
        fd.append('profileImage', logoFile);
      }

      await updateProfile(fd);
      toast.success('Organization profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-8 px-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Profile</h1>
          <p className="text-muted-foreground mt-1">Manage how your organization appears to volunteers.</p>
        </div>

        {!(company as any).isApproved && (
          <div className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex gap-3 text-warning-foreground text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
            <p>Your organization profile is currently pending administrator approval. Volunteers cannot see your opportunities yet.</p>
          </div>
        )}

        <Card className="card-premium">
          <CardHeader>
            <CardTitle>Public Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="space-y-2 shrink-0 text-center">
                <Label>Organization Logo</Label>
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 relative group">
                  {logoPreview && !logoError ? (
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
                  ) : (
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Upload className="h-6 w-6 text-white mb-1" />
                    <span className="text-xs text-white font-medium">Upload</span>
                  </div>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
              </div>

              <div className="space-y-4 flex-grow w-full">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className="bg-muted/50" />
                </div>

                <div className="space-y-2">
                  <Label>Email <span className="text-xs text-muted-foreground">(Used for login, cannot be changed)</span></Label>
                  <Input value={company.email} disabled className="bg-muted/50" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://example.org" className="bg-muted/50" />
            </div>

            <div className="space-y-2">
              <Label>About the Organization</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your mission, values, and the impact volunteers can make..."
                rows={6}
                className="bg-muted/50"
              />
            </div>

            <Button onClick={handleSaveProfile} className="gradient-primary text-primary-foreground px-8 rounded-full shadow-md">
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
