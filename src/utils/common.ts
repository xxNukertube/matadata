import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getEntropy(buffer: ArrayBuffer): number {
  const data = new Uint8Array(buffer);
  const frequencies = new Array(256).fill(0);
  for (let i = 0; i < data.length; i++) {
    frequencies[data[i]]++;
  }
  
  const len = data.length;
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const p = frequencies[i] / len;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

export function extractStrings(buffer: ArrayBuffer, minLength = 4): string[] {
  const data = new Uint8Array(buffer);
  const strings: string[] = [];
  let currentString = '';
  
  for (let i = 0; i < data.length; i++) {
    const charCode = data[i];
    // Printable ASCII range: 32-126, plus tab (9), newline (10), carriage return (13)
    if ((charCode >= 32 && charCode <= 126) || charCode === 9 || charCode === 10 || charCode === 13) {
      currentString += String.fromCharCode(charCode);
    } else {
      if (currentString.length >= minLength) {
        strings.push(currentString);
      }
      currentString = '';
    }
  }
  if (currentString.length >= minLength) {
    strings.push(currentString);
  }
  return strings;
}
