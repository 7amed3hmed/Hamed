import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UserRole } from '@/types';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function LoginPage() {
  const [role, setRole] = useState<'student' | 'company'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach(err => { fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    try {
      const success = await login(email, password, role);
      if (success) {
        toast.success('Welcome back!');
        navigate(role === 'student' ? '/student/dashboard' : '/company/dashboard');
      }
    } catch (error: any) {
      if (error.isVerified === false) {
        toast.error(error.message);
        navigate('/verify-email', { state: { email } });
      } else {
        toast.error(error.message || 'Invalid credentials');
      }
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
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
          <div className="flex rounded-lg border border-border p-1">
            <button
              onClick={() => setRole('student')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                role === 'student' ? 'gradient-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >Student</button>
            <button
              onClick={() => setRole('company')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                role === 'company' ? 'gradient-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >Company</button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full gradient-primary text-primary-foreground" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account? <Link to="/signup" className="text-primary font-medium hover:underline">Sign Up</Link>
            </p>
            <p className="text-center text-xs text-muted-foreground">
              <Link to="/login/admin" className="hover:underline">Admin Login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
