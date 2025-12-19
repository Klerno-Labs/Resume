import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function PaymentSuccess() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [plan, setPlan] = useState<string>('');
  const [credits, setCredits] = useState<number>(0);
  const { refreshUser } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setStatus('error');
      return;
    }

    const verifyPayment = async () => {
      try {
        const result = await api.verifyPayment(sessionId);
        if (result.success) {
          setPlan(result.plan);
          setCredits(result.credits);
          setStatus('success');
          // Refresh user data to get updated credits
          try {
            await refreshUser();
          } catch (refreshError) {
            console.error('Failed to refresh user data:', refreshError);
            // Still show success since payment was verified
          }
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
      }
    };

    void verifyPayment();
  }, []); // Removed refreshUser from dependencies to prevent multiple verification attempts

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold">Verifying your payment...</h1>
            <p className="text-muted-foreground">Please wait while we confirm your purchase.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Payment Successful!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your {plan} plan has been activated.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Credits added to your account</p>
              <p className="text-3xl font-bold text-primary">
                {credits === 999 ? 'Unlimited' : credits}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/editor')} size="lg" className="w-full">
                Start Optimizing Your Resume
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold">Payment Verification Failed</h1>
            <p className="text-muted-foreground">
              We couldn't verify your payment. If you were charged, please contact support.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={() => navigate('/#pricing')} size="lg" className="w-full">
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Return to Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
