import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { PagePlaceholder } from '@/components/common/PagePlaceholder';

/** PrivacyPage — Politica de Privacidade (placeholder). */
export function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <PagePlaceholder titleKey="footer.privacy">
      <div className="prose prose-invert max-w-none space-y-3 text-sm text-muted-foreground">
        <p>
          O CARSAI HOST respeita a sua privacidade. Esta politica descreve quais os dados que
          recolhemos e como os utilizamos.
        </p>
        <h3 className="text-base font-semibold text-foreground">1. Dados recolhidos</h3>
        <p>
          Recolhemos o seu email, nome de utilizador, historico de login e dados tecnicos necessarios
          para prestar o servico (IP, user-agent).
        </p>
        <h3 className="text-base font-semibold text-foreground">2. Utilizacao</h3>
        <p>
          Os dados sao usados exclusivamente para operar o servico, prevenir abuso e comunicar
          actualizacoes relevantes. Nao vendemos nem alugamos os seus dados.
        </p>
        <h3 className="text-base font-semibold text-foreground">3. Cookies</h3>
        <p>
          Usamos cookies essenciais para autenticacao e preferencias de idioma/tema. Nenhum cookie
          de publicidade e utilizado.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs">Texto legal completo sera disponibilizado antes do lancamento.</span>
        </div>
      </div>
    </PagePlaceholder>
  );
}

export default PrivacyPage;
