import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";
import { CheckCircle, Loader2, Brain, Search, BarChart3 } from "lucide-react";

interface LoadingScreenProps {
  title: string;
  subtitle: string;
  onComplete: () => void;
  duration?: number;
}

const loadingSteps = [
  { label: "Uploading files...", icon: Search, duration: 20 },
  { label: "Validating model structure...", icon: Brain, duration: 30 },
  { label: "Checking compatibility...", icon: BarChart3, duration: 25 },
  { label: "Preparing analysis...", icon: CheckCircle, duration: 25 },
];

export function LoadingScreen({
  title,
  subtitle,
  onComplete,
  duration = 4000,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const stepDuration = duration / loadingSteps.length;
    const progressInterval = duration / 100;

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 1;
      });
    }, progressInterval);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1;
        if (next < loadingSteps.length) {
          setCompletedSteps((completed) => [...completed, prev]);
          return next;
        } else {
          setCompletedSteps((completed) => [...completed, prev]);
          clearInterval(stepTimer);
          return prev;
        }
      });
    }, stepDuration);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [duration, onComplete]);

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-[0px_4px_12px_rgba(0,0,0,0.5)]">
        <CardContent className="pt-8 pb-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-[#4F9AFF] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 bg-[#4F9AFF] rounded-full opacity-20 animate-pulse" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#FFFFFF] mb-2">{title}</h2>
            <p className="text-[#B0B0B0]">{subtitle}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-sm text-[#B0B0B0]">
              <span>Processing...</span>
              <span className="text-[#4F9AFF]">{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <div className="space-y-3">
            {loadingSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.includes(index);
              const isCurrent = currentStep === index;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#28C76F]/10 text-[#28C76F] border border-[#28C76F]"
                      : isCurrent
                      ? "bg-[#4F9AFF]/10 text-[#4F9AFF] border border-[#4F9AFF]"
                      : "text-[#757575]"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-[#28C76F]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  <span className="text-sm">{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-[#757575]">
              This may take a few moments depending on your model size
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
