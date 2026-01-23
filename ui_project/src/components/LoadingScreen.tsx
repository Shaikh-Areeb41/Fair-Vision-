import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, FileSearch, Database, Lock } from "lucide-react";
import { motion } from "framer-motion";

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
}

export function LoadingScreen({ title, subtitle, onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  // Enterprise-grade "Audit" steps
  const steps = [
    { text: "Establishing secure environment...", icon: Lock },
    { text: "Verifying dataset integrity...", icon: Database },
    { text: "Loading compliance protocols...", icon: ShieldCheck },
    { text: "Initializing audit engine...", icon: FileSearch },
  ];

  useEffect(() => {
    // Progress bar animation
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) {
          clearInterval(timer);
          setTimeout(() => onComplete && onComplete(), 500); // Slight delay before finishing
          return 100;
        }
        
        // Calculate step based on progress (0-25, 26-50, etc.)
        const newStep = Math.min(Math.floor((oldProgress + 1) / 25), 3);
        setStep(newStep);
        
        // Randomize speed to look like real processing
        const diff = Math.random() * 3; 
        return Math.min(oldProgress + diff, 100);
      });
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  const CurrentIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Central Card */}
      <div className="w-full max-w-md p-8 space-y-8 text-center">
        
        {/* Animated Icon */}
        <div className="relative flex items-center justify-center mx-auto w-24 h-24">
          <motion.div 
            className="absolute inset-0 border-4 border-purple-100 dark:border-purple-900 rounded-full"
            animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <motion.div 
            key={step}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 bg-white dark:bg-zinc-900 p-4 rounded-full shadow-xl border border-purple-100 dark:border-purple-800"
          >
            <CurrentIcon className="w-10 h-10 text-purple-600" />
          </motion.div>
        </div>

        {/* Text Status */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {title || "System Initializing"}
          </h2>
          <p className="text-muted-foreground font-medium animate-pulse">
            {steps[step].text}
          </p>
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mt-4">
            GovTech Secure Audit v2.4
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-purple-600"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ ease: "linear" }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}