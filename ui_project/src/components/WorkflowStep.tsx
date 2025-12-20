import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";

interface WorkflowStepProps {
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'warning';
  children?: React.ReactNode;
  stepNumber: number;
}

export function WorkflowStep({ title, description, status, children, stepNumber }: WorkflowStepProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'current':
        return <Circle className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'current':
        return 'border-blue-200 bg-blue-50 shadow-lg';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className={`transition-all duration-300 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs px-2 py-1">
            {stepNumber}
          </Badge>
          {getStatusIcon()}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <p className="text-muted-foreground mt-2">{description}</p>
      </CardHeader>
      {children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
}