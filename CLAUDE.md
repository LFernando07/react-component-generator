# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components based on natural language descriptions, displays them in a real-time preview using a virtual file system, and allows users to iterate on components through chat.

## Development Commands

### Setup
```bash
npm run setup
# Installs dependencies, generates Prisma client, and runs database migrations
```

### Development
```bash
npm run dev
# Starts Next.js development server with Turbopack

npm run dev:daemon
# Starts dev server in background, logs to logs.txt
```

### Build & Lint
```bash
npm run build     # Build for production
npm run lint      # Run ESLint
```

### Testing
```bash
npm test          # Run all tests with Vitest
vitest src/lib/__tests__/file-system.test.ts  # Run a single test file
```

### Database
```bash
npm run db:reset  # Reset database (drops all data)
pnpm exec prisma migrate dev --name <migration-name>  # Create new migration
pnpm exec prisma generate  # Regenerate Prisma client
```

## Architecture

### Virtual File System (VFS)
The application uses an in-memory virtual file system instead of writing files to disk:
- **Core**: `src/lib/file-system.ts` - `VirtualFileSystem` class manages file/directory operations
- **Context**: `src/lib/contexts/file-system-context.tsx` - React context wraps VFS and provides hooks
- **Persistence**: VFS state serialized to JSON and stored in Prisma `Project.data` field
- **Operations**: createFile, updateFile, deleteFile, rename, readFile with full path resolution

### Component Preview System
Real-time preview using Babel transformation and ES modules:
- **Transformer**: `src/lib/transform/jsx-transformer.ts`
  - Transforms JSX/TSX to JavaScript using `@babel/standalone`
  - Creates blob URLs for each transformed file
  - Generates import maps for module resolution
  - Supports @/ alias (maps to root), relative imports, and third-party packages via esm.sh
  - Handles CSS imports separately and injects as style tags
- **Preview**: `src/components/preview/PreviewFrame.tsx`
  - Renders iframe with srcdoc containing transformed code
  - Uses import maps to resolve all module dependencies
  - Finds entry point (App.jsx/tsx, index.jsx/tsx, or first .jsx/.tsx file)
  - Includes Tailwind CDN by default

### AI Integration
Claude AI integration via Vercel AI SDK:
- **Route**: `src/app/api/chat/route.ts` - Streaming chat endpoint
- **Model**: Configured in `src/lib/provider.ts` via `@ai-sdk/anthropic`
- **Prompt**: `src/lib/prompts/generation.tsx` - System prompt for component generation
- **Tools**: AI can use file manipulation tools:
  - `str_replace_editor` (str-replace.ts) - create, str_replace, insert commands
  - `file_manager` (file-manager.ts) - rename, delete commands
- **Context**: File system state passed to AI, tool calls update VFS in real-time
- **Prompt caching**: System message uses `experimental_providerMetadata` for Claude prompt caching

### Authentication & Persistence
Optional user authentication with session-based auth:
- **Auth**: `src/lib/auth.ts` - JWT-based sessions using `jose` library
- **Middleware**: `src/middleware.ts` - Protects routes and manages session cookies
- **Anonymous mode**: Users can work without signing up (work not persisted)
- **Database**: SQLite with Prisma ORM
  - `User` model: email, password (bcrypt hashed)
  - `Project` model: stores messages + VFS state as JSON strings
- **Actions**: Server actions in `src/actions/` for CRUD operations on projects

### Code Editor
Monaco Editor integration:
- **Component**: `src/components/editor/CodeEditor.tsx` - Monaco wrapper with TypeScript/JavaScript support
- **File Tree**: `src/components/editor/FileTree.tsx` - Displays VFS hierarchy, handles file selection
- **Sync**: Editor updates propagate to VFS context, triggering preview refresh

### Application Flow
1. User sends message via `ChatInterface` component
2. Message sent to `/api/chat` with current VFS state
3. Claude generates response, potentially with tool calls to modify files
4. Tool calls processed by `FileSystemContext.handleToolCall()`
5. VFS updates trigger preview refresh via `refreshTrigger` state
6. `PreviewFrame` transforms files and renders in iframe
7. On finish, messages + VFS serialized and saved to database (if authenticated)

## Key Technical Details

### Import Resolution
The preview system resolves imports in this order:
1. Exact path matches in VFS
2. @/ alias (maps to /)
3. Relative paths (./components/Button → resolved from importing file's directory)
4. Extension variations (.jsx, .tsx, .js, .ts)
5. Third-party packages → https://esm.sh/package-name

### Testing
- Uses Vitest with React Testing Library
- Tests in `__tests__` directories next to source files
- jsdom environment for component tests

### API Key
- Optional `ANTHROPIC_API_KEY` in `.env`
- Without key, app runs with static code generation fallback

## Code Style

### Comments
Use comments sparingly. Only comment complex code where the logic is not self-evident from reading the code itself.
