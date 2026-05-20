import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.png';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);
  const { verifyOtp, sendOtp, otpEmail, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Support reading email from state if redirected from Login page
  const email = otpEmail || location.state?.email;

  useEffect(() => {
    if (!email) {
      toast.error('No email found to verify. Please log in or sign up.');
      navigate('/login');
    }
  }, [email, navigate]);

  const handleVerify = async () => {
    if (!email) return;
    try {
      const success = await verifyOtp(email, otp);
      if (success) {
        toast.success('Email verified successfully!');
        navigate('/student/dashboard'); // ProtectedRoute will automatically redirect Company/Admin to proper dashboards using logic later
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid or expired OTP');
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      const success = await sendOtp(email);
      if (success) {
        toast.success('A new OTP has been sent to your email.');
        setOtp('');
      } else {
        toast.error('Failed to resend OTP. Please try again later.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <Link to="/" className="flex justify-center">
            <img src={logo} alt="inPlace" className="h-12 w-auto mx-auto" />
          </Link>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          
          <Button 
            onClick={handleVerify} 
            className="w-full gradient-primary text-primary-foreground h-11" 
            disabled={otp.length !== 6 || isLoading}
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Verifying...</> : 'Verify Email'}
          </Button>

          <div className="text-center space-y-2 mt-2">
            <p className="text-sm text-muted-foreground">Didn't receive the code or it expired?</p>
            <Button 
              variant="outline" 
              onClick={handleResend} 
              disabled={isResending || isLoading}
              className="w-full"
            >
              {isResending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Resending...</> : 'Resend OTP'}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center border-t border-border/50 pt-4">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
