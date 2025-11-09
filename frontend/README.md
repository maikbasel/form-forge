<h1 align="center">
  <a href="https://github.com/Arbarwings/tauri-v2-nextjs-monorepo">
    <img src="https://raw.githubusercontent.com/Arbarwings/tauri-v2-nextjs-monorepo/main/.github/tauri-nextjs.jpg" alt="Tauri v2 + Next.js Monorepo">
  </a>
  <br>Tauri v2 + Next.js Monorepo<br>
</h1>

This repository contains the source code of the blog post [Tauri v2 with
Next.js: A Monorepo
Guide](https://melvinoostendorp.nl/blog/tauri-v2-nextjs-monorepo-guide). It
demonstrates how to build a cross-platform application using Tauri v2 for
desktop and mobile apps, and Next.js for web services.

## Features

- **Next.js** for web and API services.
- **Tauri v2** for building lightweight and performant native desktop and mobile
  apps.
- **Monorepo setup** powered by [TurboRepo](https://turbo.build/repo).
- **Shared components** built with TailwindCSS, Shadcn, and Lucide for a
  consistent UI across platforms.
- **Reusable backend API** using Next.js API routes.
- **Cross-platform deployment** for Web, iOS, Android, Windows, macOS, and
  Linux.

## Getting Started

### Prerequisites

Ensure the following tools are installed:

- **Node.js** (v22+)
- **pnpm** (v8+)
- **Rust** ([Install Rust](https://www.rust-lang.org/tools/install))
- **Xcode** (for iOS development) _(Optional)_
- **Android Studio** (for Android development) _(Optional)_

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Arbarwings/tauri-v2-nextjs-monorepo.git
   cd tauri-v2-nextjs-monorepo
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

### Running the Apps

#### Web (Next.js):

```bash
pnpm --filter web dev
```

#### Desktop (Tauri):

```bash
pnpm --filter native dev
```

#### Mobile (iOS/Android via Tauri):

Refer to the [Tauri Mobile
Guide](https://tauri.app/develop/#using-xcode-or-android-studio) for additional
setup.

### Shared Components

The `packages/ui` directory contains shared UI components, hooks, and utilities
built with:

- [TailwindCSS](https://tailwindcss.com/)
- [Shadcn](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)

These components ensure consistency across web, desktop, and mobile platforms.

## API Endpoints

The backend API for text analysis is powered by Next.js API routes. The main
endpoint is:

- `POST /api/text-analysis`

  - Request body: `{ "text": "Your text here" }`
  - Response:

    ```json
    {
      "success": true,
      "data": {
        "id": "unique-id",
        "timestamp": "2025-01-27T12:00:00Z",
        "analysis": {
          "wordCount": 100,
          "charCount": 500,
          "mostFrequentWord": "example",
          "sentimentScore": 1.5
        }
      }
    }
    ```

## Folder Structure

```plaintext
.
├── apps
│   ├── web        # Next.js app for web and API
│   ├── native     # Tauri app for desktop and mobile
├── packages
│   ├── ui         # Shared components, styles, and utilities
│   ├── typescript-config # Shared TypeScript configurations
│   ├── eslint-config # Shared ESLint configurations
└── turbo.json     # TurboRepo configuration
```

## Commands

- **`pnpm dev`**: Start the development server for all apps.
- **`pnpm tauri`**: Exposes the Tauri CLI for running the desktop or mobile app.
- **`pnpm tauri dev`**: Start the Tauri desktop app in development mode.
- **`pnpm tauri android dev`**: Start the Tauri android app in development mode.
- **`pnpm tauri ios dev`**: Start the Tauri iOS app in development mode.
- **`pnpm lint`**: Lint the codebase using ESLint.
- **`pnpm format`**: Format the codebase using Prettier.
- **`pnpm clean`**: Remove all build artifacts.
- **`pnpm check-types`**: Check TypeScript types.
- **`pnpm shadcn`**: Exposes the Shadcn CLI for generating components.

## Contributing

Contributions are welcome! Please fork the repository and create a pull request
with your changes.

## License

This project is licensed under the [MIT License](LICENSE).

---

### References

- [Tauri Documentation](https://tauri.app/start/)
- [Next.js Documentation](https://nextjs.org/docs/)
- [TurboRepo Documentation](https://turbo.build/repo/docs)
