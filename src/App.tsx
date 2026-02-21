/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { FileDetail } from '@/components/FileDetail';
import { calculateHashes, FileHashes } from '@/utils/hashing';
import { parseFile, MetadataResult } from '@/utils/parsers';
import { getEntropy, extractStrings } from '@/utils/common';
import { Shield, Activity, Lock } from 'lucide-react';

interface FileState {
  file: File;
  id: string;
  hashes: FileHashes | null;
  metadata: MetadataResult | null;
  entropy: number | null;
  firstBytes: ArrayBuffer | null;
  strings: string[] | null;
  analysisTime: string;
  sessionId: string;
}

export default function App() {
  const [files, setFiles] = useState<FileState[]>([]);

  const handleFilesSelected = async (selectedFiles: File[]) => {
    const newFiles = await Promise.all(selectedFiles.map(async (file) => {
      const sessionId = crypto.randomUUID();
      const analysisTime = new Date().toISOString();
      
      // Start processing
      const [hashes, metadata, arrayBuffer] = await Promise.all([
        calculateHashes(file),
        parseFile(file),
        file.arrayBuffer()
      ]);

      const entropy = getEntropy(arrayBuffer);
      const firstBytes = arrayBuffer.slice(0, 1024);
      const strings = extractStrings(arrayBuffer.slice(0, 50 * 1024)); // Limit string search to first 50KB for perf in UI

      return {
        file,
        id: crypto.randomUUID(),
        hashes,
        metadata,
        entropy,
        firstBytes,
        strings,
        analysisTime,
        sessionId
      };
    }));

    setFiles(prev => [...newFiles, ...prev]);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Navbar */}
      <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">OSINT Forensics Suite</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">Client-Side Analysis Tool</p>
            </div>
          </div>
          <div className="flex gap-4 text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-2">
              <Lock className="w-3 h-3" />
              SECURE ENCLAVE
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3" />
              OFFLINE MODE
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        
        {/* Upload Section */}
        <section>
          <FileUpload onFilesSelected={handleFilesSelected} />
        </section>

        {/* Results Section */}
        {files.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-light text-zinc-100">
                Arquivos Analisados <span className="text-zinc-600 ml-2">{files.length}</span>
              </h2>
              <button 
                onClick={() => setFiles([])}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Limpar Sessão
              </button>
            </div>

            <div className="grid gap-8">
              {files.map((fileState) => (
                <FileDetail key={fileState.id} {...fileState} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 mt-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-zinc-600 text-sm">
            Ferramenta de Análise Forense Digital & OSINT.
            <br />
            Todos os dados são processados localmente no seu navegador. Nenhum dado é enviado para servidores externos.
          </p>
          <p className="text-zinc-700 text-xs mt-4 font-mono">
            v1.0.0 • BUILD {new Date().toISOString().split('T')[0]}
          </p>
        </div>
      </footer>
    </div>
  );
}

