import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  History, 
  FileText, 
  Calendar, 
  ArrowRight, 
  Loader2, 
  Search, 
  CheckCircle, 
  AlertTriangle,
  Trash2,
  ShieldCheck,
  ClipboardList // New Icon for Audit
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";

interface DatasetRecord {
  id: string;
  filename: string;
  name: string;
  date: string;
  status: string;
  bias_status: string;
}

interface HistoryPageProps {
  onLoadDataset?: (id: string) => void;
}

export function HistoryPage({ onLoadDataset }: HistoryPageProps) {
  const navigate = useNavigate();
  const [history, setHistory] = useState<DatasetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/datasets/");
      setHistory(response.data);
    } catch (error) {
      toast.error("Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDataset = (record: DatasetRecord) => {
    toast.success(`Loading Audit "${record.name}"...`);
    if (onLoadDataset) onLoadDataset(record.id);
    sessionStorage.removeItem("analysisResults");
    sessionStorage.removeItem("hasBiasAnalysis");
    navigate("/dashboard", { state: { datasetId: record.id } });
  };

  const handleDeleteDataset = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete record "${name}"? This will remove it from the audit trail.`)) return;

    try {
        await axios.delete(`http://127.0.0.1:8000/api/datasets/${id}`);
        setHistory(prev => prev.filter(item => item.id !== id));
        toast.success("Record removed from logs");
    } catch (error) {
        toast.error("Failed to delete record");
    }
  };

  const filteredHistory = history.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 min-h-screen animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-purple-600" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            Review historical compliance checks and dataset audits.
          </p>
        </div>
        
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search audit records..."
            className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <Card className="glass-card border-none shadow-soft">
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="grid grid-cols-12 text-xs font-semibold uppercase text-muted-foreground px-2">
            <div className="col-span-4 pl-2">Audit Session Name</div>
            <div className="col-span-3">Timestamp</div>
            <div className="col-span-2">State</div>
            <div className="col-span-2">Compliance Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No audit records found. Start a new audit to generate logs.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="grid grid-cols-12 items-center p-4 hover:bg-muted/50 transition-colors group"
                >
                  {/* Name Column */}
                  <div className="col-span-4 flex items-center gap-3 pl-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-foreground truncate">{item.name}</span>
                      {item.name !== item.filename && (
                        <span className="text-xs text-muted-foreground truncate">{item.filename}</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.date).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>

                  <div className="col-span-2">
                    <Badge variant={item.status === "Analyzed" ? "default" : "secondary"} className="text-xs">
                      {item.status === "Analyzed" ? "Audited" : item.status}
                    </Badge>
                  </div>

                  <div className="col-span-2">
                    {item.status === "Mitigated" ? (
                       <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-500 text-sm font-medium">
                         <ShieldCheck className="w-3.5 h-3.5" /> Remedied
                       </div>
                    ) : item.bias_status === "Biased" ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-sm font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Non-Compliant
                      </div>
                    ) : item.bias_status === "Fair" ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 text-sm font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Compliant
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </div>

                  <div className="col-span-1 flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={(e) => handleDeleteDataset(e, item.id, item.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      onClick={() => handleLoadDataset(item)}
                    >
                      Load <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}