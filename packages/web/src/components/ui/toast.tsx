/**
 * Toast — usa Sonner (recomendado pelo shadcn/ui).
 * Exportamos o `Toaster` para montar na raiz e o `toast` para chamar.
 */
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof SonnerToaster>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, sonnerToast as toast };
export default Toaster;
