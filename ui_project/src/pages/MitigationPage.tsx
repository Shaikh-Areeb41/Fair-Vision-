import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { DecisionPoint } from "../components/DecisionPoint";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface MitigationPageProps {
  selectedMitigation?: string;
  onSelect: (technique: string) => void;
  onApply: () => void;
}

export function MitigationPage({
  selectedMitigation,
  onSelect,
  onApply,
}: MitigationPageProps) {
  const handleApply = () => {
    if (!selectedMitigation) {
      toast.error("Please select a mitigation technique first");
      return;
    }
    onApply();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Bias Mitigation
          </h1>
          <p className="text-muted-foreground">
            Apply advanced techniques to reduce bias in your model
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <DecisionPoint
          stepNumber={1}
          title="Select Mitigation Technique"
          description="Choose the most appropriate bias mitigation method for your use case"
          status="current"
          options={[
            {
              label: "Reweighing",
              value: "reweighing",
              description:
                "Modifies training sample weights to reduce disparate impact in the dataset",
            },

          ]}
          selectedOption={selectedMitigation}
          onSelect={onSelect}
        />

        {selectedMitigation && (
          <div className="flex justify-center">
            <Button
              onClick={handleApply}
              size="lg"
              className="px-8 bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600 shadow-soft-sm hover:shadow-soft-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Apply Mitigation Technique
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
