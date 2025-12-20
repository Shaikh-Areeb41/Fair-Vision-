import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { AlertTriangle, TrendingUp, Users, Target } from "lucide-react";

interface BiasMetric {
  name: string;
  value: number;
  threshold: number;
  status: "good" | "warning" | "critical";
  description: string;
}

interface BiasVisualizationProps {
  metrics: BiasMetric[];
}

export function BiasVisualization({ metrics }: BiasVisualizationProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-[#28C76F] bg-[#28C76F]/20 border-[#28C76F]";
      case "warning":
        return "text-[#FFC107] bg-[#FFC107]/20 border-[#FFC107]";
      case "critical":
        return "text-[#FF6B6B] bg-[#FF6B6B]/20 border-[#FF6B6B]";
      default:
        return "text-[#B0B0B0] bg-[#333333]";
    }
  };

  const getIcon = (index: number) => {
    const icons = [AlertTriangle, TrendingUp, Users, Target];
    const Icon = icons[index % icons.length];
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <Card
            key={metric.name}
            className="border-l-4 border-l-[#4F9AFF] shadow-[0px_4px_12px_rgba(0,0,0,0.5)] hover:shadow-[0px_0px_16px_rgba(79,154,255,0.3)] transition-all duration-200"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getIcon(index)}
                  <CardTitle className="text-base text-foreground">
                    {metric.name}
                  </CardTitle>
                </div>
                <Badge className={`${getStatusColor(metric.status)} border`}>
                  {metric.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Value</span>
                <span className="font-medium text-foreground">
                  {metric.value.toFixed(3)}
                </span>
              </div>
              <Progress value={(metric.value / 1) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Threshold: {metric.threshold.toFixed(3)}</span>
                <span>
                  {metric.value > metric.threshold ? "Above" : "Below"}{" "}
                  threshold
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-info/10 border-info shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-info mt-0.5" />
            <div>
              <h4 className="font-medium text-info mb-1">
                Bias Analysis Summary
              </h4>
              <p className="text-sm text-muted-foreground">
                {metrics.filter((m) => m.status === "critical").length > 0
                  ? "Critical bias detected. Mitigation techniques are strongly recommended."
                  : metrics.filter((m) => m.status === "warning").length > 0
                  ? "Some bias indicators found. Consider applying mitigation techniques."
                  : "Bias levels appear to be within acceptable ranges."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
