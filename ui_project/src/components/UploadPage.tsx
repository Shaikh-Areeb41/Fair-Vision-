import { useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { FileUpload } from "./FileUpload";
import { Database, Brain, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfigurationStep } from "./ConfigurationStep"; // Import the new Modal

interface BackendResponse {
  id: string;
  filename: string;
  total_rows?: number;
  size_kb?: number;
  message: string;
}

interface UploadPageProps {
  onUploadComplete: (data: {
    hasModel: boolean;
    modelFile?: File | null; // Changed to accept null
    datasetFile?: File | null; // Changed to accept null
    datasetId?: string;
  }) => void;
}

export function UploadPage({ onUploadComplete }: UploadPageProps) {
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // NEW: State for Configuration Modal
  const [showConfig, setShowConfig] = useState(false);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string>("");

  const handleContinue = async () => {
    if (!datasetFile) {
      toast.error("Please upload a dataset file");
      return;
    }

    setIsUploading(true);
    let tempId = ""; 

    try {
      // 1. Upload Dataset
      const datasetFormData = new FormData();
      datasetFormData.append("file", datasetFile);

      const datasetResponse = await axios.post<BackendResponse>(
        "http://127.0.0.1:8000/api/datasets/upload",
        datasetFormData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("Dataset Uploaded:", datasetResponse.data);
      tempId = datasetResponse.data.id;
      setUploadedDatasetId(tempId); // Save ID for the modal
      toast.success("Dataset saved successfully!");

      // 2. Upload Model (Optional)
      if (modelFile) {
        toast.info("Uploading Model...");
        const modelFormData = new FormData();
        modelFormData.append("file", modelFile);

        await axios.post<BackendResponse>(
          "http://127.0.0.1:8000/api/models/upload",
          modelFormData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        toast.success("Model saved successfully!");
      }

      // 3. Stop loading and OPEN MODAL instead of navigating
      setIsUploading(false);
      setShowConfig(true); 

    } catch (error: any) {
      setIsUploading(false);
      console.error("Upload Error:", error);
      const errorMessage = error.response?.data?.detail || "Failed to connect to backend.";
      toast.error(errorMessage);
    }
  };

  // Called when Configuration Modal hits "Save & Next" or "Skip"
  const handleConfigComplete = () => {
    setShowConfig(false);
    
    // TRIGGER THE FINAL NAVIGATION TO DASHBOARD
    const hasModel = modelFile !== null;
    onUploadComplete({
      hasModel,
      modelFile: modelFile, // Now compatible (File | null)
      datasetFile: datasetFile, // Now compatible (File | null)
      datasetId: uploadedDatasetId,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen">
      
      {/* RENDER THE CONFIGURATION MODAL */}
      <ConfigurationStep 
        isOpen={showConfig}
        datasetId={uploadedDatasetId}
        onComplete={handleConfigComplete}
        onCancel={() => handleConfigComplete()} // Allows skipping config if user cancels
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Upload Your Data
        </h1>
        <p className="text-muted-foreground">
          Upload your dataset and optionally your trained ML model to begin bias
          analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Dataset Upload - Required */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-sky-600" />
              <CardTitle className="text-foreground">Dataset Upload</CardTitle>
              <span className="text-xs px-2 py-1 rounded border border-zinc-200 bg-zinc-100 text-zinc-700 font-medium dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10">Required</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your training dataset. This will be used for bias analysis and model training if needed.
            </p>
            <FileUpload
              onFileSelect={setDatasetFile}
              selectedFile={datasetFile}
              acceptedTypes=".csv"
              placeholder="Dataset file (CSV)"
            />
          </CardContent>
        </Card>

        {/* Model Upload - Optional */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-zinc-500" />
              <CardTitle className="text-foreground">ML Model Upload</CardTitle>
              <span className="text-xs px-2 py-1 rounded border border-zinc-200 bg-zinc-100 text-zinc-700 font-medium dark:bg-zinc-800 dark:text-zinc-300 dark:border-white/10">Optional</span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your trained ML model. If not provided, we'll train a new model using your dataset.
            </p>
            <FileUpload
              onFileSelect={setModelFile}
              selectedFile={modelFile}
              acceptedTypes=".pkl,.joblib,.h5,.pt"
              placeholder="Model file (PKL, Joblib, H5, PT)"
            />
          </CardContent>
        </Card>
      </div>

      {(datasetFile || modelFile) && (
        <Card className="mb-6 glass-card">
          <CardHeader>
            <CardTitle className="text-foreground">Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {datasetFile && (
                <div className="flex items-center justify-between p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-sky-600" />
                    <div>
                      <p className="font-medium text-sky-700 dark:text-sky-300">{datasetFile.name}</p>
                      <p className="text-xs text-sky-600/80 dark:text-sky-400/80">{(datasetFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}
              {modelFile && (
                <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">{modelFile.name}</p>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">{(modelFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-foreground mb-1">What happens next?</h3>
              <p className="text-sm text-muted-foreground">
                We'll upload your data and ask you to configure the target and sensitive columns.
              </p>
            </div>
            <Button
              onClick={handleContinue}
              disabled={!datasetFile || isUploading}
              size="lg"
              className="ml-4 bg-gradient-to-r from-sky-500 to-teal-500 text-white hover:from-sky-600 hover:to-teal-600 disabled:opacity-50 shadow-soft-sm hover:shadow-soft-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}