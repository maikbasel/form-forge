export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-border/40 border-t bg-background">
      <div className="container mx-auto max-w-screen-2xl px-4 py-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Copyright */}
          <div className="text-center text-muted-foreground text-sm md:text-left">
            <p>© {currentYear} Form Forge</p>
          </div>

          {/* GitHub Link */}
          <nav className="text-muted-foreground text-sm">
            <a
              className="transition-colors hover:text-foreground"
              href="https://github.com/maikbasel/form-forge"
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
