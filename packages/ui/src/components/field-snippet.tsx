import { useEffect, useRef, useState } from "react";
import { useFieldSnippet } from "../context/field-snippet-context.tsx";

interface FieldSnippetProps {
  fieldName: string;
}

export function FieldSnippet({ fieldName }: Readonly<FieldSnippetProps>) {
  const { fieldPositions, pdfDocument } = useFieldSnippet();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const field = fieldPositions.find((f) => f.name === fieldName);

  useEffect(() => {
    if (!(field && pdfDocument && canvasRef.current)) {
      if (!field) {
        setError("Field not found");
      }
      return;
    }

    const renderPreview = async () => {
      setIsLoading(true);
      setError(null);

      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      try {
        const page = await pdfDocument.getPage(field.page);
        const viewport = page.getViewport({ scale: 2 }); // Higher scale for better quality

        // Calculate cropped region with padding
        const padding = 140; // pixels of context around the field

        if (!field.rect) {
          setError("Field position unavailable");
          setIsLoading(false);
          return;
        }

        const rect = field.rect; // [x1, y1, x2, y2]

        // Convert PDF coordinates to canvas coordinates
        const x = Math.max(0, rect[0] * 2 - padding);
        const y = Math.max(0, viewport.height - rect[3] * 2 - padding);
        const width = Math.min(
          viewport.width - x,
          (rect[2] - rect[0]) * 2 + padding * 2
        );
        const height = Math.min(
          viewport.height - y,
          (rect[3] - rect[1]) * 2 + padding * 2
        );

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
          setError("Canvas context not available");
          return;
        }

        // Render full page to temp canvas
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const tempContext = tempCanvas.getContext("2d");

        if (!tempContext) {
          setError("Temp canvas context not available");
          return;
        }

        await page.render({
          canvas: tempCanvas,
          canvasContext: tempContext,
          viewport,
        }).promise;

        // Copy cropped region to preview canvas
        context.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);

        // Highlight the field
        const fieldX = rect[0] * 2 - x;
        const fieldY = viewport.height - rect[3] * 2 - y;
        const fieldWidth = (rect[2] - rect[0]) * 2;
        const fieldHeight = (rect[3] - rect[1]) * 2;

        context.save();
        context.fillStyle = "rgba(59, 130, 246, 0.25)";
        context.fillRect(fieldX, fieldY, fieldWidth, fieldHeight);

        context.strokeStyle = "rgba(59, 130, 246, 0.9)";
        context.lineWidth = 2;
        context.strokeRect(fieldX, fieldY, fieldWidth, fieldHeight);
        context.restore();

        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to render preview"
        );
        setIsLoading(false);
      }
    };

    renderPreview();
  }, [field, pdfDocument]);

  if (!field) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Field preview not available
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-destructive text-sm">{error}</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Page {field.page}</span>
        <span className="font-mono text-muted-foreground">{fieldName}</span>
      </div>
      <div className="relative overflow-hidden rounded border bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        <canvas
          className={isLoading ? "opacity-0" : "opacity-100"}
          ref={canvasRef}
          style={{ maxWidth: "300px", height: "auto" }}
        />
      </div>
    </div>
  );
}
