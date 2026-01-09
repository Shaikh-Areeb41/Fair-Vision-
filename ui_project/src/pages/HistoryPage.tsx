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
  AlertTriangle 
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

export function HistoryPage() {
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
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDataset = (record: DatasetRecord) => {
    // 1. Notify User
    toast.success(`Loading "${record.name}"...`);
    
    // 2. Clear previous session data to avoid conflicts
    sessionStorage.removeItem("analysisResults");
    sessionStorage.removeItem("hasBiasAnalysis");
    
    // 3. Navigate to Dashboard with the ID
    // The Dashboard component will detect this ID and fetch the data automatically
    navigate("/dashboard", { state: { datasetId: record.id } });
    
    // Fallback: If your Dashboard uses props, we might need to pass it via App state, 
    // but the Route navigation state is the cleanest way to "refresh" the view.
    // For now, let's also trigger a page reload logic if needed, but navigate is best.
  };

  // Filter logic
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
            <History className="w-8 h-8 text-purple-600" />
            Analysis History
          </h1>
          <p className="text-muted-foreground mt-1">
            Access and manage your previous bias scans.
          </p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search analysis..."
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
            <div className="col-span-4 pl-2">Analysis Name</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Bias Found</div>
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
              No analysis history found. Upload a dataset to get started.
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

                  {/* Date Column */}
                  <div className="col-span-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.date).toLocaleDateString()}
                  </div>

                  {/* Status Column */}
                  <div className="col-span-2">
                    <Badge variant={item.status === "Analyzed" ? "default" : "secondary"} className="text-xs">
                      {item.status}
                    </Badge>
                  </div>

                  {/* Bias Status Column */}
                  <div className="col-span-2">
                    {item.bias_status === "Biased" ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 text-sm font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Biased
                      </div>
                    ) : item.bias_status === "Fair" ? (
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 text-sm font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Fair
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </div>

                  {/* Action Column */}
                  <div className="col-span-1 flex justify-end">
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