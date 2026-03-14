import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  History, 
  FileSpreadsheet, 
  Calendar, 
  ChevronRight, 
  ShieldCheck, 
  AlertTriangle,
  Search,
  Loader2,
  Trash2 // <--- Added Icon
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { getToken } from "../lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog"; // Using Alert Dialog for safety

interface AuditLog {
  id: string;
  filename: string;
  upload_date: string;
  row_count: number;
  status: string;
  analysis?: {
    dpd: number;
    accuracy: number;
  };
}

const BIAS_DPD_THRESHOLD = 0.1;

const getBiasStatus = (dpd: number) => {
  const magnitude = Math.abs(dpd);
  if (magnitude > BIAS_DPD_THRESHOLD) {
    return {
      label: "Biased",
      textClass: "text-destructive",
      badgeClass: "bg-destructive/15 text-destructive border border-destructive/40",
    };
  }
  return {
    label: "No Bias",
    textClass: "text-success",
    badgeClass: "bg-success/15 text-success border border-success/40",
  };
};

export function HistoryPage() {
  const API_URL = (() => {
    const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
    if (!raw) return "http://127.0.0.1:8000/api";
    const normalized = raw.replace(/\/$/, "");
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  })();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        navigate("/login");
        return;
      }
      const response = await axios.get(`${API_URL}/datasets/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
    } catch (error) {
      console.error("Failed to fetch history", error);
      toast.error("Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (log: AuditLog) => {
    localStorage.setItem("activeDatasetId", log.id);
    if (log.analysis) {
        localStorage.setItem("analysisResults", JSON.stringify(log.analysis));
    }
    navigate("/dashboard");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const token = getToken();
      if (!token) {
        toast.error("Session expired. Please sign in again.");
        navigate("/login");
        return;
      }
        await axios.delete(`${API_URL}/datasets/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Remove from UI immediately
        setLogs(prev => prev.filter(log => log.id !== id));
        toast.success("Audit log deleted.");

        // Clear active session if we deleted the current one
        if (localStorage.getItem("activeDatasetId") === id) {
            localStorage.removeItem("activeDatasetId");
            localStorage.removeItem("analysisResults");
        }

    } catch (error) {
        console.error("Delete failed", error);
        toast.error("Failed to delete record.");
    } finally {
        setDeletingId(null);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading audit records...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <History className="w-8 h-8 text-muted-foreground" /> Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Archive of all datasets uploaded and audits performed by your account.
          </p>
        </div>
        <div className="relative w-full md:w-72">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input 
             placeholder="Search filenames..." 
             className="pl-9 fv-panel bg-background/40"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {logs.length === 0 ? (
        <Card className="fv-panel border-dashed p-12 text-center">
            <div className="flex justify-center mb-4">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-medium">No Audit History Found</h3>
            <p className="text-muted-foreground mb-6">You haven't uploaded any datasets yet.</p>
            <Button onClick={() => navigate("/upload")}>Start First Audit</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLogs.map((log) => (
            <Card key={log.id} className="fv-panel fv-panel-hover transition-colors group">
              <CardContent className="p-6 flex flex-col md:flex-row items-center gap-6">
                
                {/* Icon & File Info */}
                <div className="flex items-center gap-4 flex-1">
                   <div className="p-3 bg-secondary/70 rounded-xl group-hover:bg-secondary transition-colors">
                     <FileSpreadsheet className="w-6 h-6 text-info" />
                   </div>
                   <div>
                      <h4 className="font-semibold text-lg">{log.filename}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                         <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(log.upload_date).toLocaleDateString()}
                         </span>
                         <span>•</span>
                         <span>{log.row_count} Rows</span>
                      </div>
                   </div>
                </div>

                {/* Status & Metrics */}
                 <div className="flex items-start gap-8 flex-1 justify-start md:justify-center border-l md:border-l-0 border-border pl-4 md:pl-0">
                  <div className="flex flex-col justify-start min-w-[88px]">
                        <span className="text-xs text-muted-foreground uppercase font-bold">Status</span>
                        {log.analysis ? (
                            <span className="text-sm font-semibold fv-status-text-success flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Audited
                             </span>
                        ) : (
                          <span className="text-sm font-medium text-warning flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Pending
                             </span>
                        )}
                    </div>
                    
                    {log.analysis && (
                        <>
                        <div className="flex flex-col justify-start min-w-[88px]">
                                <span className="text-xs text-muted-foreground uppercase font-bold">Bias (DPD)</span>
                                <span className={`text-sm font-bold ${getBiasStatus(log.analysis.dpd).textClass}`}>
                                  {log.analysis.dpd.toFixed(3)}
                                </span>
                          <span className={`mt-1 inline-flex w-fit self-start rounded-full px-2 py-0.5 text-[11px] font-semibold ${getBiasStatus(log.analysis.dpd).badgeClass}`}>
                                  {getBiasStatus(log.analysis.dpd).label}
                                </span>
                            </div>
                        <div className="flex flex-col justify-start min-w-[88px]">
                                <span className="text-xs text-muted-foreground uppercase font-bold">Accuracy</span>
                                <span className="text-sm font-bold">
                                    {(log.analysis.accuracy * 100).toFixed(1)}%
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* View Button */}
                    <Button 
                        variant="ghost" 
                        onClick={() => handleResume(log)}
                      className="group-hover:bg-muted"
                    >
                        View <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>

                    {/* Delete Alert Dialog */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingId === log.id}
                        >
                            {deletingId === log.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the 
                            dataset <strong>{log.filename}</strong> and all its analysis reports.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(log.id)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          >
                            Delete Record
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}