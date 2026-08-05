import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** PagePlaceholder — estrutura base para paginas que ainda nao tem conteudo. */
interface PagePlaceholderProps {
  titleKey: string;
  descriptionKey?: string;
  children?: React.ReactNode;
}

export function PagePlaceholder({ titleKey, descriptionKey, children }: PagePlaceholderProps) {
  const { t } = useTranslation();
  return (
    <div className="page-container">
      <Card>
        <CardHeader>
          <CardTitle>{t(titleKey)}</CardTitle>
          {descriptionKey && (
            <p className="text-sm text-muted-foreground">{t(descriptionKey)}</p>
          )}
        </CardHeader>
        <CardContent>
          {children ?? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Esta secao sera implementada numa proxima iteracao.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PagePlaceholder;
