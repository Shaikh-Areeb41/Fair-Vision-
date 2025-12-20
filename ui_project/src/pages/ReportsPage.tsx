import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { CheckCircle, Download, FileText } from "lucide-react";

interface ReportsPageProps {
  hasBiasAnalysis: boolean;
  hasMitigation: boolean;
  hasModel: boolean;
  trainedModel?: string;
}

export function ReportsPage({
  hasBiasAnalysis,
  hasMitigation,
  hasModel,
  trainedModel,
}: ReportsPageProps) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Reports</h1>
        <p className="text-muted-foreground">
          Download comprehensive bias analysis and mitigation reports
        </p>
      </div>

      {hasBiasAnalysis ? (
        <Card className="border-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <CardTitle>Analysis Report Ready</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Analysis Date:</span>
                <p className="text-muted-foreground">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="font-medium">Model Type:</span>
                <p className="text-muted-foreground">
                  {hasModel ? "Uploaded Model" : trainedModel}
                </p>
              </div>
              <div>
                <span className="font-medium">Mitigation Status:</span>
                <p className="text-muted-foreground">
                  {hasMitigation ? "Applied" : "Not Applied"}
                </p>
              </div>
              <div>
                <span className="font-medium">Fairness Score:</span>
                <p className="text-muted-foreground">
                  {hasMitigation ? "0.08 (Improved)" : "0.12 (Needs Attention)"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
              <Button variant="outline" className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Export Raw Data
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center py-12 border-0">
          <CardContent>
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Reports Available
            </h3>
            <p className="text-muted-foreground mb-6">
              Complete a bias analysis first to generate comprehensive reports
            </p>
            <Link to="/upload">
              <Button>Start New Analysis</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
