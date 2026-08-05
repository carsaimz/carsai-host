import { useTranslation } from 'react-i18next';
import { FolderTree, Upload, FolderPlus, Download, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** FilesPage — gestor de ficheiros (placeholder UI). */
export function FilesPage() {
  const { t } = useTranslation();

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <FolderTree className="h-5 w-5 text-primary" />
            {t('files.title')}
          </h1>
          <p className="text-sm text-muted-foreground">/htdocs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">
            <FolderPlus className="h-4 w-4" />
            {t('files.newFolder')}
          </Button>
          <Button size="sm">
            <Upload className="h-4 w-4" />
            {t('files.upload')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">/htdocs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 border-b border-border p-3 text-xs text-muted-foreground">
            <span>{t('files.path')}:</span>
            <code className="rounded bg-secondary px-1.5 py-0.5">/htdocs</code>
          </div>

          {/* File list (placeholder) */}
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <FolderTree className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 text-center text-xs text-muted-foreground">
            {t('files.empty')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FilesPage;
