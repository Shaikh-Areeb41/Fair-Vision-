import { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Settings, ArrowRight, Loader2, X, Info } from "lucide-react";
import { toast } from "sonner";

interface ConfigurationStepProps {
  datasetId: string;
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export function ConfigurationStep({ datasetId, isOpen, onComplete, onCancel }: ConfigurationStepProps) {
  const [columns, setColumns] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string>("");

  // Form State
  const [targetColumn, setTargetColumn] = useState("");
  const [sensitiveAttribute, setSensitiveAttribute] = useState("");
  const [privilegedGroup, setPrivilegedGroup] = useState("");
  const [unprivilegedGroup, setUnprivilegedGroup] = useState("");

  // Helper to get unique values from preview for hints
  const getUniqueValues = (colName: string) => {
    if (!colName || !previewData.length) return [];
    // Convert to string to handle numbers safely
    const values = new Set(previewData.map(row => String(row[colName] ?? "")));
    // Remove empty values and return top 5
    return Array.from(values).filter(v => v !== "").slice(0, 20); 
  };

  useEffect(() => {
    if (isOpen && datasetId) {
      const fetchDataset = async () => {
        setLoading(true);
        try {
          const response = await axios.get(`http://127.0.0.1:8000/api/datasets/${datasetId}`);
          // Extract columns
          const colNames = response.data.columns.map((c: any) => c.name);
          setColumns(colNames);
          // Store preview rows to give hints later
          setPreviewData(response.data.preview || []);
        } catch (error) {
          toast.error("Failed to load columns");
        } finally {
          setLoading(false);
        }
      };
      fetchDataset();
    }
  }, [isOpen, datasetId]);

  const handleSave = async () => {
    setValidationError("");
    setSaving(true); // Show loading immediately, including during validation
    if (!targetColumn || !sensitiveAttribute || !privilegedGroup || !unprivilegedGroup) {
      toast.error("Please fill in all fields");
      setSaving(false);
      return;
    }

    // Validate that the entered group values exist in the selected sensitive column
    try {
      const resp = await axios.get(`http://127.0.0.1:8000/api/datasets/${datasetId}`);
      const fullData: any[] = resp.data.full_data || [];

      if (!Array.isArray(fullData) || fullData.length === 0) {
        setValidationError("Unable to validate against dataset. Please re-upload or try again.");
        toast.error("Validation failed: dataset unavailable");
        setSaving(false);
        return;
      }

      const valSet = new Set<string>();
      for (const row of fullData) {
        const v = row?.[sensitiveAttribute];
        if (v !== undefined && v !== null) {
          valSet.add(String(v).trim());
        }
      }

      const priv = privilegedGroup.trim();
      const unpriv = unprivilegedGroup.trim();

      const missing: string[] = [];
      if (!valSet.has(priv)) missing.push(`"${priv}"`);
      if (!valSet.has(unpriv)) missing.push(`"${unpriv}"`);

      if (missing.length) {
        const msg = `Value(s) ${missing.join(" and ")} not found in column "${sensitiveAttribute}".`;
        setValidationError(msg);
        toast.error(msg);
        setSaving(false);
        return;
      }
    } catch (e) {
      setValidationError("Validation error. Please check your inputs and try again.");
      toast.error("Validation error");
      setSaving(false);
      return;
    }

    try {
      await axios.post(`http://127.0.0.1:8000/api/datasets/${datasetId}/configure`, {
        target_column: targetColumn,
        sensitive_attribute: sensitiveAttribute,
        privileged_group: privilegedGroup,
        unprivileged_group: unprivilegedGroup
      });
      
      toast.success("Configuration saved!");
      onComplete();
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <CardTitle className="text-xl text-zinc-900 dark:text-zinc-100">Dataset Configuration</CardTitle>
            </div>
            <p className="text-sm text-zinc-500">
              Map your dataset columns to help us detect bias.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {loading ? (
            <div className="py-10 text-center text-zinc-500 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-purple-500" />
              <p>Analyzing columns...</p>
            </div>
          ) : (
            <>
              {/* --- SECTION 1: COLUMN MAPPING --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Target Column <span className="text-red-500">*</span>
                  </label>
                  <select 
                    className="w-full p-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value)}
                  >
                    <option value="" disabled>Select column...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className="text-xs text-zinc-500">The outcome you want to predict (e.g. Income)</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Sensitive Attribute <span className="text-red-500">*</span>
                  </label>
                  <select 
                    className="w-full p-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    value={sensitiveAttribute}
                    onChange={(e) => setSensitiveAttribute(e.target.value)}
                  >
                    <option value="" disabled>Select column...</option>
                    {columns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <p className="text-xs text-zinc-500">The protected group (e.g. Gender, Race)</p>
                </div>
              </div>

              {/* --- SECTION 2: GROUP DEFINITION (With Hints!) --- */}
              {sensitiveAttribute && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/50 animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 text-purple-600 mt-0.5" />
                    <div className="text-sm text-purple-800 dark:text-purple-300">
                      <p className="font-medium">Values found in preview (top 5 rows):</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {getUniqueValues(sensitiveAttribute).map(val => (
                          <span key={val} className="px-2 py-0.5 bg-white dark:bg-zinc-800 rounded border border-purple-200 dark:border-purple-700 text-xs font-mono text-zinc-800 dark:text-zinc-200">
                            {val}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs mt-2 text-zinc-500">
                        Note: Other values (like "Male") may exist in the full dataset. Please type them manually below if not shown.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Privileged Group
                      </label>
                      <input 
                        type="text" 
                        placeholder="Copy exact value from above" 
                        className="w-full p-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-zinc-400"
                        value={privilegedGroup}
                        onChange={(e) => setPrivilegedGroup(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Unprivileged Group
                      </label>
                      <input 
                        type="text" 
                        placeholder="Copy exact value from above" 
                        className="w-full p-2.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-zinc-400"
                        value={unprivilegedGroup}
                        onChange={(e) => setUnprivilegedGroup(e.target.value)}
                      />
                    </div>
                  </div>
                  {validationError && (
                    <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                      {validationError}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  onClick={handleSave} 
                  disabled={saving} 
                  className="bg-purple-600 hover:bg-purple-700 text-white min-w-[160px]"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  {saving ? "Validating..." : "Save & Next"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}