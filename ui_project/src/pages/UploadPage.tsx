import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { FileUpload } from "../components/FileUpload";
import { Database, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfigurationStep } from "../components/ConfigurationStep";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken } from "../lib/api";

interface BackendResponse {
  id: string;
  filename: string;
  total_rows?: number;
  size_kb?: number;
  message: string;
}

interface UploadPageProps {
  onUploadComplete: (data: {
    datasetFile?: File | null;
    datasetId?: string;
  }) => void;
}

export function UploadPage({ onUploadComplete }: UploadPageProps) {
  const API_URL = import.meta.env.VITE_API_URL; 
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // State for Configuration Modal
  const [showConfig, setShowConfig] = useState(false);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string>("");

  useEffect(() => {
    const queryDatasetId = searchParams.get("datasetId");
    if (!queryDatasetId) return;

    setUploadedDatasetId(queryDatasetId);
    localStorage.setItem("activeDatasetId", queryDatasetId);
    sessionStorage.setItem("activeDatasetId", queryDatasetId);
    setShowConfig(true);
  }, [searchParams]);

  const handleContinue = async () => {
    if (!datasetFile) {
      toast.error("Please upload a dataset file");
      return;
    }

    setIsUploading(true);
    let tempId = ""; 

    try {
      // 1. Get Token from Storage
      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please log in again.");
        navigate("/login");
        return;
      }

      // 2. Upload Dataset with Auth Header
      const datasetFormData = new FormData();
      datasetFormData.append("file", datasetFile);
      
      const datasetResponse = await axios.post<BackendResponse>(
        `${API_URL}/datasets/upload`,
        datasetFormData,
        { 
          headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}` // <--- CRITICAL FIX
          } 
        }
      );

      console.log("Dataset Uploaded:", datasetResponse.data);
      tempId = datasetResponse.data.id;
      
      // Save ID to storage so other pages can find it
      localStorage.setItem("activeDatasetId", tempId);
      setUploadedDatasetId(tempId);
      
      toast.success("Dataset saved successfully!");

      // 3. Open Configuration Modal
      setIsUploading(false);
      setShowConfig(true); 

    } catch (error: any) {
      setIsUploading(false);
      console.error("Upload Error:", error);
      
      if (error.response?.status === 401) {
          toast.error("Session invalid. Please log in again.");
          navigate("/login");
      } else {
          const errorMessage = error.response?.data?.detail || "Failed to connect to backend.";
          toast.error(errorMessage);
      }
    }
  };

  const handleConfigComplete = () => {
    setShowConfig(false);
    
    // Trigger final navigation
    onUploadComplete({
      datasetFile: datasetFile,
      datasetId: uploadedDatasetId,
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      
      {/* Configuration Modal */}
      <ConfigurationStep 
        isOpen={showConfig}
        datasetId={uploadedDatasetId}
        onComplete={handleConfigComplete}
        onCancel={() => setShowConfig(false)}
      />

      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Upload Your Data
        </h1>
        <p className="text-muted-foreground">
          Upload your dataset to begin bias analysis.
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        {/* Dataset Upload */}
        <Card className="fv-panel fv-accent-left-info w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-foreground">Dataset Upload</CardTitle>
              <span className="text-xs px-2 py-1 rounded border border-border bg-secondary/50 text-foreground font-semibold">Required</span>
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

      </div>

      {/* Summary Card */}
      {datasetFile && (
        <Card className="mb-6 fv-panel fv-accent-left-success">
          <CardHeader>
            <CardTitle className="text-foreground">Upload Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {datasetFile && (
                <div className="flex items-center justify-between p-3 bg-info/10 border border-info/35 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-info" />
                    <div>
                      <p className="font-medium text-info">{datasetFile.name}</p>
                      <p className="text-xs text-info/80">{(datasetFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Bar */}
      <Card className="fv-panel fv-accent-left-analytics">
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
              className="ml-4 min-w-[160px] text-primary-foreground disabled:opacity-50 shadow-soft-sm hover:shadow-soft-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] bg-[linear-gradient(120deg,rgb(var(--status-info)),rgb(var(--status-success)))] hover:opacity-95"
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
