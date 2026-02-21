import SparkMD5 from 'spark-md5';

export interface FileHashes {
  md5: string;
  sha1: string;
  sha256: string;
  sha512: string;
}

export async function calculateHashes(file: File): Promise<FileHashes> {
  const arrayBuffer = await file.arrayBuffer();
  
  // MD5 using spark-md5
  const spark = new SparkMD5.ArrayBuffer();
  spark.append(arrayBuffer);
  const md5 = spark.end();

  // SHA hashes using Web Crypto API
  const crypto = window.crypto.subtle;
  
  const sha1Buffer = await crypto.digest('SHA-1', arrayBuffer);
  const sha1 = bufferToHex(sha1Buffer);

  const sha256Buffer = await crypto.digest('SHA-256', arrayBuffer);
  const sha256 = bufferToHex(sha256Buffer);

  const sha512Buffer = await crypto.digest('SHA-512', arrayBuffer);
  const sha512 = bufferToHex(sha512Buffer);

  return { md5, sha1, sha256, sha512 };
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
