import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Upload, File, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  disabled?: boolean;
  acceptedTypes?: string;
  placeholder?: string;
}

export function FileUpload({
  onFileSelect,
  selectedFile,
  disabled,
  acceptedTypes = "*",
  placeholder = "file",
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <Card
          className={`fv-panel border-2 border-dashed transition-all duration-200 cursor-pointer ${
            isDragOver
              ? "border-info/70 bg-info/10"
              : disabled
              ? "border-border bg-muted/40 cursor-not-allowed"
              : "border-border hover:border-info/50 hover:bg-muted/40"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Upload
              className={`w-8 h-8 mb-4 ${
                disabled ? "text-muted-foreground" : "text-info"
              }`}
            />
            <p
              className={`text-center ${
                disabled ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              Drag and drop your {placeholder} here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supported formats:{" "}
              {acceptedTypes.replace(/\./g, "").toUpperCase()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="fv-panel border-success/40 bg-success/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <File className="w-5 h-5 text-success" />
              <div>
                <p className="font-medium text-success">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-success/80">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-success hover:text-success hover:bg-success/20"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
