"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SAMPLE_PHISHING_EMAIL, SAMPLE_SAFE_EMAIL } from "@/data/demo-data";
import {
  FileText,
  UploadCloud,
  FileCode,
  Sparkles,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  FileUp,
  X,
  AlertCircle,
  Play,
} from "lucide-react";

interface EmailInputPanelProps {
  subject: string;
  sender: string;
  body: string;
  onSubjectChange: (val: string) => void;
  onSenderChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
  initialMode?: "paste" | "upload";
}

export function EmailInputPanel({
  subject,
  sender,
  body,
  onSubjectChange,
  onSenderChange,
  onBodyChange,
  onAnalyze,
  isLoading,
  initialMode = "paste",
}: EmailInputPanelProps) {
  const [mode, setMode] = useState<"paste" | "upload">(initialMode);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  const handleClear = () => {
    onSubjectChange("");
    onSenderChange("");
    onBodyChange("");
    setUploadedFile(null);
  };

  const handleLoadPhishingSample = () => {
    onSubjectChange(SAMPLE_PHISHING_EMAIL.subject);
    onSenderChange(SAMPLE_PHISHING_EMAIL.sender);
    onBodyChange(SAMPLE_PHISHING_EMAIL.body);
    setMode("paste");
  };

  const handleLoadSafeSample = () => {
    onSubjectChange(SAMPLE_SAFE_EMAIL.subject);
    onSenderChange(SAMPLE_SAFE_EMAIL.sender);
    onBodyChange(SAMPLE_SAFE_EMAIL.body);
    setMode("paste");
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const validExts = [".txt", ".eml", ".msg"];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      alert("Please upload a .txt or .eml email file.");
      return;
    }

    setUploadedFile({ name: file.name, size: file.size });
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onBodyChange(content);
      if (!subject) {
        onSubjectChange(`Imported File: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;
  const charCount = body.length;

  return (
    <Card className="h-full flex flex-col border-[#273449]">
      <CardHeader className="pb-3 border-b border-[#273449]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <span>Email Input</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                Input Panel
              </span>
            </CardTitle>
            <CardDescription>
              Submit email text or upload a message file for neural analysis
            </CardDescription>
          </div>

          {/* Mode Switch Tabs */}
          <div className="inline-flex items-center p-1 bg-[#101729] rounded-xl border border-[#273449]">
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                mode === "paste"
                  ? "bg-[#8B5CF6] text-white shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6]"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Paste Email
            </button>
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                mode === "upload"
                  ? "bg-[#8B5CF6] text-white shadow-sm"
                  : "text-[#9CA3AF] hover:text-[#F3F4F6]"
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload File
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-5 space-y-4">
        {/* Sample Load Buttons Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#101729]/80 border border-[#273449]">
          <span className="text-[11px] font-semibold text-[#9CA3AF] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#8B5CF6]" />
            Quick Test Samples:
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadPhishingSample}
              className="text-xs h-7 text-red-300 border-red-500/30 hover:bg-red-500/10"
            >
              <AlertOctagon className="w-3 h-3 text-red-400 mr-1" />
              Sample Phishing
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSafeSample}
              className="text-xs h-7 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" />
              Sample Safe
            </Button>
            {(body || subject) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs h-7 px-2 text-[#9CA3AF] hover:text-white"
                title="Clear all fields"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {mode === "upload" && (
          <div className="space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all ${
                isDragging
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/10"
                  : "border-[#273449] bg-[#101729]/60 hover:border-slate-500"
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1B2740] border border-[#273449] flex items-center justify-center mb-3 text-[#8B5CF6]">
                <FileUp className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#F3F4F6]">
                Drag and drop your email file here
              </p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Supports <span className="text-slate-300 font-mono">.txt</span> and{" "}
                <span className="text-slate-300 font-mono">.eml</span> files up to 5MB
              </p>

              <label className="mt-4 cursor-pointer">
                <input
                  type="file"
                  accept=".txt,.eml"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1B2740] hover:bg-[#233354] text-[#F3F4F6] border border-[#273449] transition-colors">
                  <UploadCloud className="w-4 h-4" />
                  Browse Files
                </span>
              </label>
            </div>

            {uploadedFile && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1B2740]/60 border border-[#273449]">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <FileCode className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <div className="truncate text-xs">
                    <span className="font-medium text-[#F3F4F6]">{uploadedFile.name}</span>
                    <span className="text-[#9CA3AF] ml-2 text-[10px]">
                      ({(uploadedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="p-1 text-[#9CA3AF] hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Optional Subject & Sender inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">
              Email Subject (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. URGENT: Action required..."
              value={subject}
              onChange={(e) => onSubjectChange(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-[#101729] text-[#F3F4F6] placeholder-[#9CA3AF]/60 rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">
              Sender Address (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. security-alert@external-verify.com"
              value={sender}
              onChange={(e) => onSenderChange(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-[#101729] text-[#F3F4F6] placeholder-[#9CA3AF]/60 rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        {/* Email Body Textarea */}
        <div className="flex-1 flex flex-col space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Email Body Content <span className="text-red-400">*</span>
            </label>
            <div className="text-[11px] text-[#9CA3AF]">
              <span>{wordCount} words</span> • <span>{charCount} chars</span>
            </div>
          </div>
          <textarea
            required
            rows={10}
            placeholder="Paste the email content here for analysis…"
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            className="w-full flex-1 min-h-[220px] p-3.5 text-xs font-mono leading-relaxed bg-[#101729] text-[#F3F4F6] placeholder-[#9CA3AF]/60 rounded-xl border border-[#273449] focus:outline-none focus:border-[#8B5CF6] resize-none"
          />
        </div>

        {/* Privacy Note & Primary Action */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#101729]/60 border border-[#273449]/60 text-[11px] text-[#9CA3AF]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Privacy Notice:</strong> Do not paste real passwords, confidential access tokens or sensitive personally identifiable information into this demo environment.
            </span>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full justify-center shadow-lg shadow-violet-900/30"
            isLoading={isLoading}
            disabled={!body.trim()}
            onClick={onAnalyze}
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            Analyze Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

