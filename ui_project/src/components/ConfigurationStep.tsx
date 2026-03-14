import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "./ui/select";
import { 
  Settings, 
  ArrowRight, 
  Loader2, 
  Info, 
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "./ui/utils";
import { getToken } from "../lib/api";

interface ConfigurationStepProps {
  datasetId: string;
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function ConfigurationStep({ datasetId, isOpen, onComplete, onCancel }: ConfigurationStepProps) {
  const API_URL = (() => {
    const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (!raw) return "http://127.0.0.1:8000/api";
    const normalized = raw.replace(/\/$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  })();
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  // Form State
  const [datasetName, setDatasetName] = useState("");
  const [targetColumn, setTargetColumn] = useState("");
  const [sensitiveAttribute, setSensitiveAttribute] = useState("");
  const [privilegedGroup, setPrivilegedGroup] = useState("");
  const [unprivilegedGroup, setUnprivilegedGroup] = useState("");

  // 1. OPTIMIZATION: Memoize unique values
  const { allValues, displayValues } = useMemo(() => {
    if (!sensitiveAttribute || !previewData.length) return { allValues: new Set<string>(), displayValues: [] };
    
    // Get all unique values from the preview data
    const values = new Set(previewData.map(row => String(row[sensitiveAttribute] ?? "").trim()));
    const list = Array.from(values).filter(v => v !== "");
    
    return {
        allValues: values,
        displayValues: list.slice(0, 200) // <--- LIMIT INCREASED TO 200
    };
  }, [sensitiveAttribute, previewData]);

  // Fetch Data
  useEffect(() => {
    if (isOpen && datasetId) {
      const fetchDataset = async () => {
        setLoading(true);
        try {
          const token = getToken();
          if (!token) {
            toast.error("Session expired. Please log in again.");
            onCancel();
            return;
          }
          const response = await axios.get(`${API_URL}/datasets/${datasetId}`, {
             headers: { Authorization: `Bearer ${token}` }
          });
          
          const rawColumns = response.data.columns || [];
          const processedCols = rawColumns.map((col: any) => 
            typeof col === 'string' ? col : col.name
          ).filter(Boolean); 

          setColumns(processedCols);
          setPreviewData(response.data.preview || []);
          
          if (!datasetName && response.data.filename) {
             setDatasetName(response.data.filename.replace(".csv", ""));
          }
        } catch (error: any) {
          console.error(error);
          const message = error?.response?.data?.detail || "Failed to load columns";
          toast.error(message);
        } finally {
          setLoading(false);
        }
      };
      fetchDataset();
    }
  }, [isOpen, datasetId]);

  const handlePillClick = (val: string) => {
    if (!privilegedGroup) {
      setPrivilegedGroup(val);
    } else if (!unprivilegedGroup && val !== privilegedGroup) {
      setUnprivilegedGroup(val);
    } else {
      setPrivilegedGroup(val);
    }
  };

  const handleSave = async () => {
    setValidationError("");
    setSaving(true); 
    
    if (!targetColumn || !sensitiveAttribute || !privilegedGroup || !unprivilegedGroup) {
      toast.error("Please fill in all required fields");
      setSaving(false);
      return;
    }

    try {

      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please log in again.");
        onCancel();
        return;
      }
      
      // 1. Save Config
      await axios.post(`${API_URL}/datasets/${datasetId}/configure`, {
   target_column: targetColumn,         // Key must match Python
        sensitive_attribute: sensitiveAttribute, // Key must match Python
        privileged_group: privilegedGroup,   // Key must match Python
        unprivileged_group: unprivilegedGroup, // Key must match Python
        dataset_name: datasetName            // Key must match Python
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Configuration saved successfully!");
      onComplete(); // Navigate to Dashboard

    } catch (error) {
      console.error(error);
      toast.error("Validation failed");
      setValidationError("Failed to validate inputs. Check if values exist in the dataset.");
    } finally {
      setSaving(false);
    }
  };

  // Helper: Returns true ONLY if the exact value exists in the dataset
  const isValidValue = (val: string) => allValues.has(val.trim());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[680px] gap-0 p-0 overflow-hidden rounded-xl border border-border bg-background shadow-lg text-foreground">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-5 bg-background border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-3xl text-foreground">
             <Settings className="w-5 h-5 text-primary" />
             Dataset Configuration
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Map your columns to prepare for bias analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Analyzing dataset structure...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Dataset Name */}
              <div className="space-y-2">
                <Label htmlFor="dsName" className="text-foreground">Analysis Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                <Input 
                  id="dsName"
                  placeholder="e.g. Credit Risk Model - Jan 2024" 
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="h-12 rounded-xl bg-background text-foreground placeholder:text-muted-foreground border-border"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Column */}
                <div className="space-y-2">
                   <Label className="flex items-center gap-1 text-foreground">
                     Target Column <span className="text-destructive">*</span>
                   </Label>
                   <Select value={targetColumn} onValueChange={setTargetColumn}>
                    <SelectTrigger className="h-12 rounded-xl bg-background text-foreground border-border data-[placeholder]:text-muted-foreground px-4">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[220px] !bg-[rgb(var(--popover))] !text-[rgb(var(--popover-foreground))] !opacity-100 !backdrop-blur-none border border-border shadow-md">
                      {columns.map(c => <SelectItem key={c} value={c} className="text-popover-foreground">{c}</SelectItem>)}
                    </SelectContent>
                   </Select>
                   <p className="text-xs text-muted-foreground">The outcome to predict (e.g. Income)</p>
                </div>

                {/* Sensitive Attribute */}
                <div className="space-y-2">
                   <Label className="flex items-center gap-1 text-foreground">
                     Sensitive Attribute <span className="text-destructive">*</span>
                   </Label>
                   <Select value={sensitiveAttribute} onValueChange={setSensitiveAttribute}>
                    <SelectTrigger className="h-12 rounded-xl bg-background text-foreground border-border data-[placeholder]:text-muted-foreground px-4">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent className="z-[100] max-h-[220px] !bg-[rgb(var(--popover))] !text-[rgb(var(--popover-foreground))] !opacity-100 !backdrop-blur-none border border-border shadow-md">
                      {columns.map(c => <SelectItem key={c} value={c} className="text-popover-foreground">{c}</SelectItem>)}
                    </SelectContent>
                   </Select>
                   <p className="text-xs text-muted-foreground">The protected group (e.g. Gender)</p>
                </div>
              </div>

              {/* Dynamic Group Selection */}
              {sensitiveAttribute && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  
                  {/* Quick Select Pills */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                      <Info className="w-4 h-4" />
                      Available Values (Click to fill)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {displayValues.length > 0 ? displayValues.map((val) => (
                        <button
                          key={val}
                          onClick={() => handlePillClick(val)}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-full border transition-all cursor-pointer",
                            "bg-card border-border text-foreground",
                            "hover:border-primary hover:text-primary hover:shadow-sm active:scale-95"
                          )}
                        >
                          {val}
                        </button>
                      )) : (
                        <p className="text-xs text-muted-foreground italic">No values found in preview data.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Privileged (Advantaged)</Label>
                      <div className="relative">
                        <Input 
                          placeholder="e.g. Male" 
                          value={privilegedGroup}
                          onChange={(e) => setPrivilegedGroup(e.target.value)}
                          className="bg-background pr-8 text-foreground placeholder:text-muted-foreground border-border"
                        />
                        {isValidValue(privilegedGroup) && (
                          <CheckCircle2 className="w-4 h-4 absolute right-3 top-3 text-[rgb(var(--status-success))]" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unprivileged (Disadvantaged)</Label>
                      <div className="relative">
                         <Input 
                            placeholder="e.g. Female" 
                            value={unprivilegedGroup}
                            onChange={(e) => setUnprivilegedGroup(e.target.value)}
                            className="bg-background pr-8 text-foreground placeholder:text-muted-foreground border-border"
                          />
                          {isValidValue(unprivilegedGroup) && (
                            <CheckCircle2 className="w-4 h-4 absolute right-3 top-3 text-[rgb(var(--status-success))]" />
                          )}
                      </div>
                    </div>
                  </div>

                  {validationError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/30">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {validationError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-background sm:justify-end gap-3">
          <Button variant="ghost" className="text-foreground hover:bg-muted" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="min-w-[160px] h-11 rounded-xl text-primary-foreground disabled:opacity-50 shadow-soft-sm hover:shadow-soft-lg transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] bg-[linear-gradient(120deg,rgb(var(--status-info)),rgb(var(--status-success)))] hover:opacity-95"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validating...
              </>
            ) : (
              <>
                Save & Next <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}