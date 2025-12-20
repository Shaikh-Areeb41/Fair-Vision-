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
  acceptedTypes = ".pkl,.joblib,.h5,.pt",
  placeholder = "ML model file",
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
          className={`border-2 border-dashed transition-all duration-200 cursor-pointer shadow-[0px_4px_12px_rgba(0,0,0,0.5)] ${
            isDragOver
              ? "border-[#4F9AFF] bg-[#4F9AFF]/10 shadow-[0px_0px_16px_rgba(79,154,255,0.3)]"
              : disabled
              ? "border-[#2E2E2E] bg-[#1E1E1E]"
              : "border-[#3A3A3A] hover:border-[#4F9AFF] hover:bg-[#2A2A2A]"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Upload
              className={`w-8 h-8 mb-4 ${
                disabled ? "text-[#757575]" : "text-[#4F9AFF]"
              }`}
            />
            <p
              className={`text-center ${
                disabled ? "text-[#757575]" : "text-[#B0B0B0]"
              }`}
            >
              Drag and drop your {placeholder} here, or click to browse
            </p>
            <p className="text-xs text-[#757575] mt-2">
              Supported formats:{" "}
              {acceptedTypes.replace(/\./g, "").toUpperCase()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-[#28C76F] bg-[#28C76F]/10 shadow-[0px_4px_12px_rgba(0,0,0,0.5)]">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <File className="w-5 h-5 text-[#28C76F]" />
              <div>
                <p className="font-medium text-[#28C76F]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-[#28C76F]/80">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!disabled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-[#28C76F] hover:text-[#28C76F] hover:bg-[#28C76F]/20"
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
