import { Server } from 'lucide-react';

/** FullScreenLoader — spinner full-screen para Suspense fallback. */
export function FullScreenLoader() {
  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Server className="h-5 w-5" />
        </span>
      </div>
      <p className="text-sm text-muted-foreground">A carregar...</p>
    </div>
  );
}

export default FullScreenLoader;
