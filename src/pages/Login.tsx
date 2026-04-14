import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        toast.success('Successfully logged in!');
        // Redirection logic is handled by App.tsx ProtectedRoute or we can do it here
        // But we need to wait for the profile to be loaded.
        // For now, let's just wait a bit or let App.tsx handle it.
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Login failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-frosted p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-10 rounded-[32px] shadow-2xl flex flex-col items-center"
      >
        <div className="text-4xl font-bold tracking-tight text-primary mb-8 text-center">As Super Market</div>
        
        <h1 className="text-2xl font-bold text-text-main mb-2">Welcome Back</h1>
        <p className="text-text-muted mb-10 text-center">Sign in to access premium essentials delivery.</p>
        
        <Button 
          onClick={handleGoogleLogin}
          className="w-full h-14 bg-white/80 hover:bg-white text-text-main border border-white/40 rounded-2xl flex items-center justify-center gap-3 shadow-sm transition-all active:scale-[0.98] backdrop-blur-md"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          <span className="font-semibold">Continue with Google</span>
        </Button>
        
        <p className="mt-10 text-xs text-text-muted text-center leading-relaxed">
          By continuing, you agree to our <br/>
          <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
