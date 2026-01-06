import { VirtualFileSystem } from "../file-system";

export type FileManagerCommand = "rename" | "delete";

export interface FileManagerParams {
  command: FileManagerCommand;
  path: string;
  new_path?: string;
}

export function buildFileManagerTool(fileSystem: VirtualFileSystem) {
  return async function executeFileManagerCommand(
    params: FileManagerParams
  ) {
    const { command, path, new_path } = params;

    try {
      switch (command) {
        case "rename": {
          if (!new_path) {
            return {
              success: false,
              error: "new_path is required for rename command",
            };
          }

          const success = fileSystem.rename(path, new_path);

          if (!success) {
            return {
              success: false,
              error: `Failed to rename ${path} to ${new_path}`,
            };
          }

          return {
            success: true,
            result: {
              from: path,
              to: new_path,
            },
          };
        }

        case "delete": {
          const success = fileSystem.deleteFile(path);

          if (!success) {
            return {
              success: false,
              error: `Failed to delete ${path}`,
            };
          }

          return {
            success: true,
            result: {
              deleted: path,
            },
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
