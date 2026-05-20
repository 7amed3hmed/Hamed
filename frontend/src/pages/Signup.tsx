import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';

const studentSchema = z.object({
  username: z.string().min(2, 'Username required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

const companySchema = z.object({
  companyName: z.string().min(2, 'Company name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
});

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'company' ? 'company' : 'student';
  const [role, setRole] = useState<'student' | 'company'>(initialRole);
  const [form, setForm] = useState({ username: '', companyName: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signup, sendOtp, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const schema = role === 'student' ? studentSchema : companySchema;
    const result = schema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    try {
      const success = await signup({ ...form, role }, role);
      if (success) {
        toast.success('Account created! OTP sent to your email');
        navigate('/verify-email', { state: { email: form.email } });
      }
    } catch (error: any) {
      toast.error(error.message || 'Could not create account');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="flex items-center justify-center gap-2">
            <img src={logo} alt="inPlace" className="h-12 w-auto" />
            <span className="text-2xl font-bold gradient-primary-text">inPlace</span>
          </Link>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join inPlace today</CardDescription>
          <div className="flex rounded-lg border border-border p-1">
            <button onClick={() => setRole('student')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${role === 'student' ? 'gradient-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
            >Student</button>
            <button onClick={() => setRole('company')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${role === 'company' ? 'gradient-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
            >Company</button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === 'student' ? (
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={form.username} onChange={e => update('username', e.target.value)} placeholder="johndoe" />
                {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input value={form.companyName} onChange={e => update('companyName', e.target.value)} placeholder="Acme Inc." />
                {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
