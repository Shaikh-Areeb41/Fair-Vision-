import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { GitBranch } from "lucide-react";

interface DecisionPointProps {
  title: string;
  description: string;
  options: {
    label: string;
    value: string;
    description?: string;
  }[];
  selectedOption?: string;
  onSelect: (value: string) => void;
  stepNumber: number;
  status: "pending" | "current" | "completed";
}

export function DecisionPoint({
  title,
  description,
  options,
  selectedOption,
  onSelect,
  stepNumber,
  status,
}: DecisionPointProps) {
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "border-[#28C76F] bg-[#28C76F]/10";
      case "current":
        return "border-[#4F9AFF] bg-[#4F9AFF]/10 shadow-[0px_0px_16px_rgba(79,154,255,0.3)]";
      default:
        return "border-[#2E2E2E] bg-[#1E1E1E]";
    }
  };

  return (
    <Card
      className={`transition-all duration-300 shadow-[0px_4px_12px_rgba(0,0,0,0.5)] ${getStatusColor()}`}
    >
      <CardHeader className="pb-3 !text-foreground dark:!text-white">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="text-xs px-2 py-1 border-[#4F9AFF] text-[#4F9AFF]"
          >
            {stepNumber}
          </Badge>
          <GitBranch className="w-5 h-5 text-[#FFC107]" />
          <CardTitle className="text-lg !text-foreground dark:!text-white">{title}</CardTitle>
        </div>
        <p className="!text-muted-foreground dark:!text-[#B0B0B0] mt-2">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            className={`group w-full justify-start text-left h-auto p-4 transition-all duration-200 !text-foreground dark:!text-[#FFFFFF] [&_*]:!text-foreground dark:[&_*]:!text-white ${
              selectedOption === option.value
                ? "bg-gradient-to-r from-[#4F9AFF] to-[#3B8EF9] hover:from-[#3B8EF9] hover:to-[#367CE9] shadow-[0px_0px_16px_rgba(79,154,255,0.3)]"
                : "border-[#3A3A3A] hover:bg-[#2A2A2A] hover:border-[#4F9AFF]"
            }`}
            onClick={() => onSelect(option.value)}
            disabled={status === "pending"}
          >
            <div>
              <div className="font-medium !text-foreground dark:!text-white">{option.label}</div>
              {option.description && (
                <div className="text-xs !text-muted-foreground dark:!text-[#B0B0B0] mt-1">
                  {option.description}
                </div>
              )}
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
