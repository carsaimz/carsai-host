import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { PagePlaceholder } from '@/components/common/PagePlaceholder';

/** TermsPage — Termos de Servico (placeholder). */
export function TermsPage() {
  const { t } = useTranslation();
  return (
    <PagePlaceholder titleKey="footer.terms">
      <div className="prose prose-invert max-w-none space-y-3 text-sm text-muted-foreground">
        <p>
          Ao utilizar o CARSAI HOST, concorda com os seguintes termos. Esta plataforma oferece
          hospedagem web gratuita atraves da infraestrutura iFastNet (Byet) via MOFH.
        </p>
        <h3 className="text-base font-semibold text-foreground">1. Uso aceitavel</h3>
        <p>
          Nao e permitido hospedar conteudo ilegal, spam, malware, pornografia infantil ou material
          protegido por direitos de autor sem autorizacao.
        </p>
        <h3 className="text-base font-semibold text-foreground">2. Contas</h3>
        <p>
          Cada utilizador pode criar contas de hospedagem razoavel para uso pessoal ou de pequenas
          empresas. Contas inactivas podem ser suspensas apos 30 dias sem actividade.
        </p>
        <h3 className="text-base font-semibold text-foreground">3. Limitacoes</h3>
        <p>
          O servico e fornecido "tal como esta". Nao garantimos uptime absoluto. Limites de CPU,
          RAM e largura de banda podem ser aplicados para garantir a equidade.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-3">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs">Texto legal completo sera disponibilizado antes do lancamento.</span>
        </div>
      </div>
    </PagePlaceholder>
  );
}

export default TermsPage;
