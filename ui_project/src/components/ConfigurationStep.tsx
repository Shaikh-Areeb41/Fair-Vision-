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

interface ConfigurationStepProps {
  datasetId: string;
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function ConfigurationStep({ datasetId, isOpen, onComplete, onCancel }: ConfigurationStepProps) {
  const API_URL = import.meta.env.VITE_API_URL; 
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
          const token = localStorage.getItem("access_token");
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
        } catch (error) {
          console.error(error);
          toast.error("Failed to load columns");
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

      const token = localStorage.getItem("access_token");
      
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
      // 2. TRIGGER ANALYSIS (New Step)
      toast.info("Starting bias analysis...");
      await axios.post(`${API_URL}/analysis/${datasetId}/train`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Analysis complete!");
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
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl z-50">
        
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
             <Settings className="w-5 h-5 text-purple-600" />
             Dataset Configuration
          </DialogTitle>
          <DialogDescription>
            Map your columns to prepare for bias analysis.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <p className="text-sm font-medium">Analyzing dataset structure...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Dataset Name */}
              <div className="space-y-2">
                <Label htmlFor="dsName">Analysis Name <span className="text-zinc-400 font-normal">(Optional)</span></Label>
                <Input 
                  id="dsName"
                  placeholder="e.g. Credit Risk Model - Jan 2024" 
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="bg-zinc-50/50 dark:bg-zinc-900/50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Target Column */}
                <div className="space-y-2">
                   <Label className="flex items-center gap-1">
                      Target Column <span className="text-red-500">*</span>
                   </Label>
                   <Select value={targetColumn} onValueChange={setTargetColumn}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    {/* FIX: Force solid background color to remove glass transparency */}
                    <SelectContent className="z-[100] max-h-[200px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-md">
                      {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                   </Select>
                   <p className="text-[10px] text-zinc-500">The outcome to predict (e.g. Income)</p>
                </div>

                {/* Sensitive Attribute */}
                <div className="space-y-2">
                   <Label className="flex items-center gap-1">
                      Sensitive Attribute <span className="text-red-500">*</span>
                   </Label>
                   <Select value={sensitiveAttribute} onValueChange={setSensitiveAttribute}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    {/* FIX: Force solid background color to remove glass transparency */}
                    <SelectContent className="z-[100] max-h-[200px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-md">
                      {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                   </Select>
                   <p className="text-[10px] text-zinc-500">The protected group (e.g. Gender)</p>
                </div>
              </div>

              {/* Dynamic Group Selection */}
              {sensitiveAttribute && (
                <div className="rounded-xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                  
                  {/* Quick Select Pills */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-purple-900 dark:text-purple-200 font-medium">
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
                            "bg-white dark:bg-zinc-800 border-purple-200 dark:border-purple-800 text-zinc-700 dark:text-zinc-300",
                            "hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 hover:shadow-sm active:scale-95"
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
                      <Label className="text-xs uppercase tracking-wider text-zinc-500">Privileged (Advantaged)</Label>
                      <div className="relative">
                        <Input 
                          placeholder="e.g. Male" 
                          value={privilegedGroup}
                          onChange={(e) => setPrivilegedGroup(e.target.value)}
                          className="bg-white dark:bg-zinc-950 pr-8"
                        />
                        {isValidValue(privilegedGroup) && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-wider text-zinc-500">Unprivileged (Disadvantaged)</Label>
                      <div className="relative">
                         <Input 
                            placeholder="e.g. Female" 
                            value={unprivilegedGroup}
                            onChange={(e) => setUnprivilegedGroup(e.target.value)}
                            className="bg-white dark:bg-zinc-950 pr-8"
                          />
                          {isValidValue(unprivilegedGroup) && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                          )}
                      </div>
                    </div>
                  </div>

                  {validationError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
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
        <DialogFooter className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white min-w-[140px]"
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