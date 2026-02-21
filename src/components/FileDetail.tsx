import React, { useState } from 'react';
import { cn, formatBytes, bufferToHex } from '@/utils/common';
import { FileHashes } from '@/utils/hashing';
import { MetadataResult } from '@/utils/parsers';
import { AlertTriangle, MapPin, Calendar, Camera, FileCode, Hash, Download, Copy, Check } from 'lucide-react';

interface FileDetailProps {
  file: File;
  hashes: FileHashes | null;
  metadata: MetadataResult | null;
  entropy: number | null;
  firstBytes: ArrayBuffer | null;
  strings: string[] | null;
  analysisTime: string;
  sessionId: string;
}

export function FileDetail({ file, hashes, metadata, entropy, firstBytes, strings, analysisTime, sessionId }: FileDetailProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'metadata' | 'hex' | 'strings'>('summary');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadReport = () => {
    const report = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      sessionId,
      analysisTime,
      hashes,
      entropy,
      metadata: metadata?.metadata,
      warnings: metadata?.warnings,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FORENSIC_REPORT_${file.name}_${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!hashes || !metadata) {
    return <div className="p-8 text-center text-zinc-500 animate-pulse">Analisando arquivo...</div>;
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 bg-zinc-950 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            {file.name}
            <span className="text-xs font-normal px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              {formatBytes(file.size)}
            </span>
          </h2>
          <div className="flex gap-4 mt-2 text-xs text-zinc-500 font-mono">
            <span>ID SESSÃO: {sessionId}</span>
            <span>DATA: {analysisTime}</span>
          </div>
        </div>
        <button 
          onClick={downloadReport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Relatório JSON
        </button>
      </div>

      {/* Warnings Banner */}
      {(metadata.warnings.length > 0 || (entropy && entropy > 7.5)) && (
        <div className="bg-red-900/20 border-b border-red-900/50 p-4">
          <h3 className="text-red-400 text-sm font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            ANOMALIAS DETECTADAS
          </h3>
          <ul className="list-disc list-inside text-xs text-red-300 space-y-1">
            {entropy && entropy > 7.5 && (
              <li>Entropia Alta ({entropy.toFixed(3)}) - Possível criptografia ou compactação oculta</li>
            )}
            {metadata.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 bg-zinc-900/50">
        {(['summary', 'metadata', 'hex', 'strings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === tab 
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5" 
                : "border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Hashes */}
            <section>
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Hash className="w-4 h-4" /> Assinaturas Criptográficas (Hashes)
              </h3>
              <div className="grid gap-3">
                {Object.entries(hashes).map(([algo, hash]) => (
                  <div key={algo} className="group relative bg-zinc-950 p-3 rounded border border-zinc-800 font-mono text-xs break-all">
                    <span className="text-zinc-500 uppercase mr-3 select-none w-16 inline-block">{algo}</span>
                    <span className="text-zinc-300">{hash}</span>
                    <button 
                      onClick={() => copyToClipboard(hash as string, algo)}
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-zinc-800 rounded text-zinc-400"
                    >
                      {copied === algo ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Basic Info */}
            <section className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Propriedades do Arquivo</h3>
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tipo MIME</span>
                    <span className="text-zinc-200">{file.type || 'Desconhecido'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tamanho</span>
                    <span className="text-zinc-200">{file.size.toLocaleString()} bytes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Entropia de Shannon</span>
                    <span className={cn("font-mono", entropy && entropy > 7.5 ? "text-red-400 font-bold" : "text-zinc-200")}>
                      {entropy?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Detecção de Formato</h3>
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Parser Utilizado</span>
                    <span className="text-emerald-400 font-medium">{metadata.fileType}</span>
                  </div>
                  {metadata.chunks && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Chunks/Seções</span>
                      <span className="text-zinc-200">{metadata.chunks.length} detectados</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-6">
            {/* GPS Special Section */}
            {metadata.metadata.gps && (
              <div className="bg-zinc-950 border border-emerald-900/30 rounded-lg p-4 mb-4">
                <h3 className="text-emerald-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Dados de Geolocalização Encontrados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {Object.entries(metadata.metadata.gps).map(([key, val]: [string, any]) => (
                     <div key={key} className="flex justify-between border-b border-zinc-800 pb-1">
                       <span className="text-zinc-500">{key}</span>
                       <span className="text-zinc-200">{String(val)}</span>
                     </div>
                  ))}
                </div>
                {metadata.metadata.gps.Latitude && metadata.metadata.gps.Longitude && (
                   <div className="mt-4 flex gap-2">
                     <a 
                       href={`https://www.google.com/maps?q=${metadata.metadata.gps.Latitude},${metadata.metadata.gps.Longitude}`} 
                       target="_blank" 
                       rel="noreferrer"
                       className="text-xs bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded hover:bg-emerald-900/50 border border-emerald-900/50"
                     >
                       Abrir no Google Maps
                     </a>
                   </div>
                )}
              </div>
            )}

            {/* Generic Metadata Renderer */}
            <div className="grid gap-4">
              {Object.entries(metadata.metadata).map(([key, value]) => {
                if (key === 'gps' || key === 'exif' || key === 'xmp') return null; // Handle separately or skip if handled
                if (typeof value === 'object' && value !== null) {
                   return (
                     <div key={key} className="bg-zinc-950 rounded border border-zinc-800 overflow-hidden">
                       <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 font-bold text-zinc-400 text-xs uppercase">
                         {key}
                       </div>
                       <div className="p-4 space-y-2">
                         {Object.entries(value).map(([subKey, subVal]) => (
                           <div key={subKey} className="grid grid-cols-3 gap-4 text-sm border-b border-zinc-800/50 pb-1 last:border-0">
                             <span className="text-zinc-500 font-mono text-xs truncate" title={subKey}>{subKey}</span>
                             <span className="text-zinc-300 col-span-2 break-all">
                               {typeof subVal === 'object' && subVal && 'description' in subVal 
                                 ? (subVal as any).description 
                                 : String(subVal)}
                             </span>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                }
                return (
                   <div key={key} className="flex justify-between border-b border-zinc-800 pb-2">
                     <span className="text-zinc-500">{key}</span>
                     <span className="text-zinc-200 font-mono text-sm">{String(value)}</span>
                   </div>
                );
              })}

              {/* ExifReader specific structure flattening */}
              {metadata.metadata.exif && (
                 <div className="bg-zinc-950 rounded border border-zinc-800 overflow-hidden">
                    <div className="bg-zinc-900/50 px-4 py-2 border-b border-zinc-800 font-bold text-zinc-400 text-xs uppercase">
                      EXIF Data
                    </div>
                    <div className="p-4 space-y-2">
                      {Object.entries(metadata.metadata.exif).map(([key, val]: [string, any]) => (
                        <div key={key} className="grid grid-cols-3 gap-4 text-sm border-b border-zinc-800/50 pb-1 last:border-0">
                          <span className="text-zinc-500 font-mono text-xs truncate" title={key}>{key}</span>
                          <span className="text-zinc-300 col-span-2 break-all">{val.description}</span>
                        </div>
                      ))}
                    </div>
                 </div>
              )}
            </div>

            {metadata.xmlDump && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">XML Dump (XMP/DocProps)</h3>
                <pre className="bg-zinc-950 p-4 rounded border border-zinc-800 text-xs text-zinc-400 overflow-x-auto font-mono">
                  {metadata.xmlDump}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'hex' && firstBytes && (
          <div className="font-mono text-xs">
            <div className="grid grid-cols-[auto_1fr] gap-4">
              <div className="text-zinc-600 select-none text-right border-r border-zinc-800 pr-4">
                {Array.from({ length: Math.ceil(firstBytes.byteLength / 16) }).map((_, i) => (
                  <div key={i}>{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</div>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-8">
                <div className="text-zinc-300">
                  {Array.from({ length: Math.ceil(firstBytes.byteLength / 16) }).map((_, i) => {
                    const chunk = new Uint8Array(firstBytes.slice(i * 16, (i + 1) * 16));
                    return (
                      <div key={i} className="flex gap-2">
                        {Array.from(chunk).map((b, j) => (
                          <span key={j} className={cn(
                            "w-5 text-center inline-block",
                            b === 0 ? "text-zinc-700" : "text-zinc-300"
                          )}>
                            {b.toString(16).padStart(2, '0').toUpperCase()}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <div className="text-zinc-500 border-l border-zinc-800 pl-4">
                   {Array.from({ length: Math.ceil(firstBytes.byteLength / 16) }).map((_, i) => {
                    const chunk = new Uint8Array(firstBytes.slice(i * 16, (i + 1) * 16));
                    return (
                      <div key={i} className="whitespace-pre">
                        {Array.from(chunk).map((b) => (
                          (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.'
                        )).join('')}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'strings' && strings && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 mb-4">Exibindo strings ASCII encontradas (min. 4 chars). Útil para encontrar metadados ocultos, URLs ou assinaturas.</p>
            <div className="bg-zinc-950 rounded border border-zinc-800 p-4 h-96 overflow-y-auto font-mono text-xs text-zinc-300">
              {strings.map((s, i) => (
                <div key={i} className="border-b border-zinc-900/50 py-0.5 hover:bg-zinc-900 hover:text-white cursor-text select-text">
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
