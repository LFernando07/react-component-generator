import { VirtualFileSystem } from "@/lib/file-system";

export type FileCommand =
  | "view"
  | "create"
  | "str_replace"
  | "insert"
  | "undo_edit";

export interface FileToolParams {
  command: FileCommand;
  path: string;
  file_text?: string;
  insert_line?: number;
  new_str?: string;
  old_str?: string;
  view_range?: [number, number];
}

export function buildStrReplaceTool(fileSystem: VirtualFileSystem) {
  return async function executeFileCommand(params: FileToolParams) {
    const {
      command,
      path,
      file_text,
      insert_line,
      new_str,
      old_str,
      view_range,
    } = params;

    try {
      switch (command) {
        case "view": {
          return {
            success: true,
            result: fileSystem.viewFile(path, view_range),
          };
        }

        case "create": {
          return {
            success: true,
            result: fileSystem.createFileWithParents(path, file_text ?? ""),
          };
        }

        case "str_replace": {
          if (!old_str || !new_str) {
            return {
              success: false,
              error: "old_str and new_str are required for str_replace",
            };
          }

          return {
            success: true,
            result: fileSystem.replaceInFile(path, old_str, new_str),
          };
        }

        case "insert": {
          if (insert_line === undefined || !new_str) {
            return {
              success: false,
              error: "insert_line and new_str are required for insert",
            };
          }

          return {
            success: true,
            result: fileSystem.insertInFile(path, insert_line, new_str),
          };
        }

        case "undo_edit": {
          return {
            success: false,
            error:
              "undo_edit is not supported. Use str_replace with previous content to revert changes.",
          };
        }

        default: {
          return {
            success: false,
            error: `Unknown command: ${command}`,
          };
        }
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  };
}
