import ExifReader from 'exifreader';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { getEntropy, extractStrings } from './common';

export interface MetadataResult {
  fileType: string;
  metadata: Record<string, any>;
  raw?: any;
  warnings: string[];
  chunks?: { name: string; size: number; offset?: number }[];
  xmlDump?: string;
}

// --- JPEG / Generic Image Parser ---
export async function parseImage(file: File): Promise<MetadataResult> {
  const warnings: string[] = [];
  let tags: any = {};
  
  try {
    tags = await ExifReader.load(file, { expanded: true });
  } catch (e) {
    warnings.push(`Erro ao ler EXIF: ${(e as Error).message}`);
  }

  // Check for software modification
  if (tags.exif?.Software || tags.xmp?.CreatorTool) {
    warnings.push(`Software detectado: ${tags.exif?.Software?.description || tags.xmp?.CreatorTool?.description}`);
  }

  // Check date consistency
  const created = tags.exif?.DateTimeOriginal?.description;
  const modified = tags.exif?.DateTime?.description; // Often modification date
  if (created && modified && created > modified) {
    warnings.push('Inconsistência Temporal: Data de Criação posterior à Data de Modificação');
  }

  return {
    fileType: 'IMAGE',
    metadata: tags,
    warnings,
  };
}

// --- PNG Parser ---
export async function parsePng(file: File): Promise<MetadataResult> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const chunks: { name: string; size: number; offset: number }[] = [];
  const warnings: string[] = [];
  
  // Magic number check
  if (data[0] !== 0x89 || data[1] !== 0x50 || data[2] !== 0x4E || data[3] !== 0x47) {
    warnings.push('Assinatura PNG inválida');
  }

  let offset = 8;
  while (offset < data.length) {
    if (offset + 8 > data.length) break;
    
    const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    
    chunks.push({ name: type, size: length, offset });
    
    // Move to next chunk: length + type(4) + data(length) + crc(4)
    offset += 4 + 4 + length + 4;
  }

  // Use ExifReader for standard metadata inside chunks
  const imageResult = await parseImage(file);

  return {
    fileType: 'PNG',
    metadata: imageResult.metadata,
    warnings: [...warnings, ...imageResult.warnings],
    chunks,
  };
}

// --- PDF Parser ---
export async function parsePdf(file: File): Promise<MetadataResult> {
  const arrayBuffer = await file.arrayBuffer();
  const warnings: string[] = [];
  let metadata: Record<string, any> = {};
  let xmlDump = '';

  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
    
    metadata = {
      pageCount: pdfDoc.getPageCount(),
      title: pdfDoc.getTitle(),
      author: pdfDoc.getAuthor(),
      subject: pdfDoc.getSubject(),
      keywords: pdfDoc.getKeywords(),
      creator: pdfDoc.getCreator(),
      producer: pdfDoc.getProducer(),
      creationDate: pdfDoc.getCreationDate(),
      modificationDate: pdfDoc.getModificationDate(),
    };

    // Check for JS
    const catalog = pdfDoc.catalog;
    // This is a basic check. Deep JS detection in PDF is complex.
    // We can scan strings for /JavaScript or /JS
    const strings = extractStrings(arrayBuffer);
    if (strings.some(s => s.includes('/JavaScript') || s.includes('/JS'))) {
      warnings.push('JavaScript embarcado detectado (potencialmente malicioso)');
    }
    if (strings.some(s => s.includes('/OpenAction') || s.includes('/AA'))) {
      warnings.push('Ações automáticas detectadas (/OpenAction ou /AA)');
    }

    // Attempt to extract raw XMP
    // pdf-lib doesn't expose raw XMP easily via high-level API if not set, 
    // but we can try to find the Metadata stream in the raw file or via low-level objects if needed.
    // For now, we rely on basic metadata.
    
  } catch (e) {
    warnings.push(`Erro ao analisar PDF: ${(e as Error).message}`);
  }

  return {
    fileType: 'PDF',
    metadata,
    warnings,
    xmlDump
  };
}

// --- DOCX Parser ---
export async function parseDocx(file: File): Promise<MetadataResult> {
  const warnings: string[] = [];
  const metadata: Record<string, any> = {};
  let xmlDump = '';

  try {
    const zip = await JSZip.loadAsync(file);
    
    // Core Properties
    const coreFile = zip.file('docProps/core.xml');
    if (coreFile) {
      const text = await coreFile.async('text');
      xmlDump += '--- docProps/core.xml ---\n' + text + '\n\n';
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      const extract = (tag: string) => {
        const el = xmlDoc.getElementsByTagName(tag)[0];
        return el ? el.textContent : null;
      };

      metadata.core = {
        creator: extract('dc:creator'),
        lastModifiedBy: extract('cp:lastModifiedBy'),
        revision: extract('cp:revision'),
        created: extract('dcterms:created'),
        modified: extract('dcterms:modified'),
        title: extract('dc:title'),
        subject: extract('dc:subject'),
        description: extract('dc:description'),
      };

      if (metadata.core.created && metadata.core.modified) {
         if (new Date(metadata.core.created) > new Date(metadata.core.modified)) {
             warnings.push('Inconsistência Temporal: Criado depois de Modificado');
         }
      }
    }

    // App Properties
    const appFile = zip.file('docProps/app.xml');
    if (appFile) {
      const text = await appFile.async('text');
      xmlDump += '--- docProps/app.xml ---\n' + text + '\n\n';
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      
      const extract = (tag: string) => {
        const el = xmlDoc.getElementsByTagName(tag)[0];
        return el ? el.textContent : null;
      };

      metadata.app = {
        template: extract('Template'),
        totalTime: extract('TotalTime'),
        pages: extract('Pages'),
        words: extract('Words'),
        application: extract('Application'),
        company: extract('Company'),
        docSecurity: extract('DocSecurity'),
      };
    }
    
    // Custom Properties
    const customFile = zip.file('docProps/custom.xml');
    if (customFile) {
        const text = await customFile.async('text');
        xmlDump += '--- docProps/custom.xml ---\n' + text + '\n\n';
        // Parse custom props if needed
    }

  } catch (e) {
    warnings.push(`Erro ao analisar DOCX (ZIP): ${(e as Error).message}`);
  }

  return {
    fileType: 'DOCX',
    metadata,
    warnings,
    xmlDump
  };
}

export async function parseFile(file: File): Promise<MetadataResult> {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return parseImage(file);
  }
  if (type === 'image/png' || name.endsWith('.png')) {
    return parsePng(file);
  }
  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return parsePdf(file);
  }
  if (type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx')) {
    return parseDocx(file);
  }

  // Generic fallback
  return {
    fileType: 'GENERIC',
    metadata: {},
    warnings: [],
  };
}
