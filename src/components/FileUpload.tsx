import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSearch, ShieldAlert, FileText, X } from 'lucide-react';
import { cn } from '@/utils/common';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileUpload({ onFilesSelected }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onFilesSelected(acceptedFiles);
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop } as any);

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300",
        isDragActive 
          ? "border-emerald-500 bg-emerald-500/10" 
          : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50 bg-zinc-900/50"
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 rounded-full bg-zinc-800">
          <Upload className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">
            {isDragActive ? "Solte os arquivos aqui..." : "Arraste e solte arquivos forenses"}
          </h3>
          <p className="text-zinc-400 mt-2 text-sm">
            Suporta JPG, PNG, PDF, DOCX e Genéricos. Processamento 100% local.
          </p>
        </div>
        <div className="flex gap-2 mt-4 text-xs text-zinc-500 uppercase tracking-wider">
          <span className="px-2 py-1 bg-zinc-800 rounded">Cadeia de Custódia</span>
          <span className="px-2 py-1 bg-zinc-800 rounded">Hash Automático</span>
          <span className="px-2 py-1 bg-zinc-800 rounded">Offline</span>
        </div>
      </div>
    </div>
  );
}
