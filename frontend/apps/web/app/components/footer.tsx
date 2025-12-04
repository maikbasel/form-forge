export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/40 border-t bg-background">
      <div className="container mx-auto max-w-screen-2xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Left side - Copyright */}
          <div className="text-center text-muted-foreground text-sm md:text-left">
            <p>© {currentYear} Form Forge. All rights reserved.</p>
          </div>

          {/* Right side - Links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 text-muted-foreground text-sm md:gap-6">
            <a
              className="transition-colors hover:text-foreground"
              href="/about"
            >
              About
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="/privacy"
            >
              Privacy
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="/terms"
            >
              Terms
            </a>
            <a
              className="transition-colors hover:text-foreground"
              href="https://github.com"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
