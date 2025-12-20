import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Brain, Settings, Play, CheckCircle, TrendingUp } from "lucide-react";
import { DecisionPoint } from "./DecisionPoint";
import { toast } from "sonner";

interface TrainingPageProps {
  onTrainingComplete: (modelType: string) => void;
  datasetId?: string;
}

export function TrainingPage({ onTrainingComplete, datasetId }: TrainingPageProps) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string | null>(
    null
  );
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStep, setTrainingStep] = useState("");
  const intervalRef = useRef<number | null>(null);

  const algorithmOptions = [
    {
      label: "Logistic Regression",
      value: "logistic_regression",
      description:
        "Fast, interpretable linear model. Good for binary classification and understanding feature importance.",
      metrics: { accuracy: "87%", speed: "Fast", interpretability: "High" },
    },
  ];

  const trainingSteps = [
    "Preprocessing data...",
    "Splitting train/validation sets...",
    "Training model...",
    "Validating performance...",
    "Optimizing hyperparameters...",
    "Finalizing model...",
  ];

  const handleStartTraining = async () => {
    if (!selectedAlgorithm) {
      toast.error("Please select an algorithm first");
      return;
    }

    // Require dataset id to run backend training
    if (selectedAlgorithm === "logistic_regression" && !datasetId) {
      toast.error("Dataset is missing. Please upload a dataset first.");
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    // Simulate training process
    const totalSteps = trainingSteps.length;
    intervalRef.current = window.setInterval(() => {
      setTrainingProgress((prev) => {
        const newProgress = prev + 100 / totalSteps;

        if (newProgress >= 100) {
          if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
          setTrainingStep("Training completed!");
          setTimeout(() => {
            setIsTraining(false);
            onTrainingComplete(selectedAlgorithm);
            toast.success("Model training completed successfully!");
          }, 1000);
          return 100;
        }

        setTrainingStep(
          trainingSteps[Math.floor(newProgress / (100 / totalSteps))]
        );
        return newProgress;
      });
    }, 800);

    // If Logistic Regression selected, trigger backend analysis same as Dashboard "Run Bias Scan"
    if (selectedAlgorithm === "logistic_regression" && datasetId) {
      try {
        const resp = await axios.post(`http://127.0.0.1:8000/api/analysis/${datasetId}/train`);
        try { sessionStorage.setItem("analysisResults", JSON.stringify(resp?.data || {})); } catch {}
        // Mark analysis done for Dashboard gating
        try { sessionStorage.setItem("hasBiasAnalysis", "true"); } catch {}
        // Immediately complete and route to analysis via parent handler
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        setTrainingStep("Training completed!");
        setTrainingProgress(100);
        setIsTraining(false);
        onTrainingComplete(selectedAlgorithm);
        toast.success("Bias analysis completed!");
        return;
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || "Training failed");
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        setIsTraining(false);
        return;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);

  if (isTraining) {
    return (
      <div className="p-6 max-w-2xl mx-auto min-h-screen bg-background">
        <Card className="shadow-soft glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-[#4F9AFF] animate-pulse" />
              <CardTitle className="text-foreground">
                Training Your Model
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-sky-500 mb-2">
                {Math.round(trainingProgress)}%
              </div>
              <p className="text-muted-foreground">{trainingStep}</p>
            </div>

            <Progress value={trainingProgress} className="w-full h-3" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-sky-50 dark:bg-sky-900/10 border border-sky-300 dark:border-sky-800 rounded-lg">
                <TrendingUp className="w-6 h-6 text-sky-500 mx-auto mb-1" />
                <p className="text-sm font-medium text-foreground">Algorithm</p>
                <p className="text-xs text-sky-600 dark:text-sky-400 capitalize">
                  {selectedAlgorithm?.replace("_", " ")}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-300 dark:border-emerald-800 rounded-lg">
                <Settings className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-foreground">
                  Optimization
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Auto-tuning</p>
              </div>
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/10 border border-cyan-300 dark:border-cyan-800 rounded-lg">
                <CheckCircle className="w-6 h-6 text-cyan-600 mx-auto mb-1" />
                <p className="text-sm font-medium text-foreground">Validation</p>
                <p className="text-xs text-cyan-600 dark:text-cyan-400">Cross-validation</p>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              This process may take several minutes depending on your dataset
              size
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen bg-background">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Train Your Model
        </h1>
        <p className="text-muted-foreground">
          Select a machine learning algorithm to train on your dataset
        </p>
      </div>

      <div className="space-y-6">
        <DecisionPoint
          stepNumber={1}
          title="Choose Algorithm"
          description="Select the machine learning algorithm that best fits your use case"
          status="current"
          options={algorithmOptions}
          selectedOption={selectedAlgorithm || undefined}
          onSelect={setSelectedAlgorithm}
        />

        {selectedAlgorithm && (
          <Card className="glass-card border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-900/10">
            <CardHeader>
              <CardTitle className="text-sky-600 dark:text-sky-400">
                Selected Algorithm Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {(() => {
                  const selected = algorithmOptions.find(
                    (opt) => opt.value === selectedAlgorithm
                  );
                  return selected
                    ? Object.entries(selected.metrics).map(([key, value]) => (
                        <div
                          key={key}
                          className="text-center p-3 bg-card border border-border rounded-lg"
                        >
                          <p className="text-sm font-medium text-foreground capitalize">
                            {key}
                          </p>
                          <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                            {value}
                          </p>
                        </div>
                      ))
                    : null;
                })()}
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleStartTraining}
                  size="lg"
                  className="px-8 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 shadow-soft-sm hover:shadow-soft-lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Training
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Algorithm Comparison */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-foreground">
              Algorithm Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-2 text-foreground">Algorithm</th>
                    <th className="text-center p-2 text-foreground">Accuracy</th>
                    <th className="text-center p-2 text-foreground">Speed</th>
                    <th className="text-center p-2 text-foreground">
                      Interpretability
                    </th>
                    <th className="text-center p-2 text-foreground">Best For</th>
                  </tr>
                </thead>
                <tbody>
                  {algorithmOptions.map((algo) => (
                    <tr
                      key={algo.value}
                      className={`border-b border-border hover:bg-muted transition-colors duration-200 ${
                        selectedAlgorithm === algo.value ? "bg-sky-50 dark:bg-sky-900/10" : ""
                      }`}
                    >
                      <td className="p-2 font-medium text-foreground">
                        {algo.label}
                      </td>
                      <td className="text-center p-2 text-muted-foreground">
                        {algo.metrics.accuracy}
                      </td>
                      <td className="text-center p-2">
                        <Badge
                          variant={
                            algo.metrics.speed === "Fast"
                              ? "default"
                              : algo.metrics.speed === "Medium"
                              ? "secondary"
                              : "outline"
                          }
                          className={
                            algo.metrics.speed === "Fast"
                              ? "bg-emerald-500"
                              : algo.metrics.speed === "Medium"
                              ? "bg-amber-400 text-black"
                              : "border-border text-muted-foreground"
                          }
                        >
                          {algo.metrics.speed}
                        </Badge>
                      </td>
                      <td className="text-center p-2 text-muted-foreground">
                        {algo.metrics.interpretability}
                      </td>
                      <td className="text-center p-2 text-xs text-muted-foreground">
                        {algo.value === "logistic_regression" &&
                          "Binary classification"}
                        {algo.value === "random_forest" && "Mixed data types"}
                        {algo.value === "gradient_boosting" &&
                          "High accuracy needs"}
                        {algo.value === "neural_network" && "Complex patterns"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
