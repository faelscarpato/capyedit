export type BasicMetadata = {
  fileName: string;
  type: string;
  size: number;
  lastModified: number;
};

export function readBasicMetadata(file: File): BasicMetadata {
  return {
    fileName: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified
  };
}
