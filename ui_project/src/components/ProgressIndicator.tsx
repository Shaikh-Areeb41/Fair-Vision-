import { Progress } from "./ui/progress";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

export function ProgressIndicator({ currentStep, totalSteps, stepTitles }: ProgressIndicatorProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-4 mb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">FairVision Workflow</h2>
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      
      <Progress value={progressPercentage} className="w-full" />
      
      <div className="flex justify-between text-xs text-muted-foreground">
        {stepTitles.map((title, index) => (
          <span 
            key={index}
            className={`${
              index < currentStep 
                ? 'text-green-600' 
                : index === currentStep - 1 
                  ? 'text-blue-600' 
                  : 'text-gray-400'
            }`}
          >
            {title}
          </span>
        ))}
      </div>
    </div>
  );
}