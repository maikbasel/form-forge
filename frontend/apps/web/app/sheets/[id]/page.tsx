import SheetViewerClient from "./sheet-viewer-client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SheetViewerPage({ params }: PageProps) {
  const { id } = await params;

  return <SheetViewerClient sheetId={id} />;
}
