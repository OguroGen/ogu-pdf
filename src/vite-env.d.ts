/// <reference types="vite/client" />

type WellKnownDirectory =
  | "desktop"
  | "documents"
  | "downloads"
  | "music"
  | "pictures"
  | "videos";

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type FilePickerOptions = {
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
  startIn?: FileSystemHandle | WellKnownDirectory;
};

type OpenFilePickerOptions = FilePickerOptions & {
  multiple?: boolean;
};

type SaveFilePickerOptions = FilePickerOptions & {
  suggestedName?: string;
};

type DirectoryPickerOptions = {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: FileSystemHandle | WellKnownDirectory;
};

interface Window {
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemHandle {
  queryPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
}
