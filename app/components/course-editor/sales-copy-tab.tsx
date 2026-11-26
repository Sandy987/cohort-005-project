import { Save } from "lucide-react";
import { MonacoMarkdownEditor } from "~/components/monaco-markdown-editor";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export function SalesCopyTab({
  salesCopy,
  savedSalesCopy,
  isSaving,
  onChange,
  onSave,
}: {
  salesCopy: string;
  savedSalesCopy: string;
  isSaving: boolean;
  onChange: (salesCopy: string) => void;
  onSave: () => void;
}) {
  const salesCopyHasChanges = salesCopy !== savedSalesCopy;
  const salesCopyIsEmpty = salesCopy.trim().length === 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Sales Copy</h2>
        <p className="text-sm text-muted-foreground">
          Write the course sales copy in Markdown. This is shown on the public
          course page. Press Ctrl+S to format and save.
        </p>
      </CardHeader>
      <CardContent>
        <MonacoMarkdownEditor
          value={salesCopy}
          onChange={onChange}
          onSave={onSave}
        />
        <div className="mt-4 flex items-center gap-4">
          <Button
            onClick={onSave}
            disabled={!salesCopyHasChanges || salesCopyIsEmpty || isSaving}
          >
            <Save className="mr-1.5 size-4" />
            {isSaving ? "Saving..." : "Save Sales Copy"}
          </Button>
          <SalesCopyNotice
            isEmpty={salesCopyIsEmpty}
            hasChanges={salesCopyHasChanges}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SalesCopyNotice({
  isEmpty,
  hasChanges,
}: {
  isEmpty: boolean;
  hasChanges: boolean;
}) {
  if (isEmpty) {
    return (
      <span className="text-sm text-destructive">
        Sales copy cannot be empty.
      </span>
    );
  }
  if (!hasChanges) return null;
  return (
    <span className="text-sm text-muted-foreground">
      You have unsaved changes.
    </span>
  );
}
