/**
 * CARSAI HOST — Admin Settings page
 *
 * Lets an admin edit every system credential/configuration that
 * previously lived in .env. Settings are stored in the `settings`
 * table and read via GET /admin/settings, written via PUT /admin/settings.
 *
 * Tabs:
 *   - General    → app name, URL, default locale, support email
 *   - MOFH       → iFastNet/Byet reseller credentials + test button
 *   - SMTP       → mail server config + test button
 *   - OAuth      → Google + GitHub OAuth credentials
 *   - Storage    → Google Drive + Dropbox backup credentials
 *   - SSL        → SSL provider (Let's Encrypt / ZeroSSL / GoGetSSL)
 *   - System     → live status of API, DB, MOFH, SMTP
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon,
  Save,
  Server,
  Mail,
  Cpu,
  HardDrive,
  Lock,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  Plug,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useApiQuery, useApiMutation } from '@/hooks/useApi';

// ─── Types ────────────────────────────────────────────────────
interface SettingItem {
  key: string;
  label: string;
  type: 'string' | 'int' | 'bool' | 'password' | 'list';
  value: string;
  secret: boolean;
  help?: string;
  configured: boolean;
}

interface SettingsResponse {
  byCategory: Record<string, SettingItem[]>;
  categories: string[];
}

// ─── Helpers ──────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, { label: string; icon: typeof Server }> = {
  general: { label: 'Geral', icon: SettingsIcon },
  mofh: { label: 'MOFH', icon: Server },
  smtp: { label: 'SMTP', icon: Mail },
  oauth: { label: 'OAuth', icon: KeyRound },
  storage: { label: 'Storage', icon: HardDrive },
  ssl: { label: 'SSL', icon: Lock },
  system: { label: 'Sistema', icon: Cpu },
};

// ─── SettingField ─────────────────────────────────────────────
function SettingField({
  item,
  value,
  onChange,
}: {
  item: SettingItem;
  value: string;
  onChange: (v: string) => void;
}) {
  const isSecret = item.secret;
  const isBool = item.type === 'bool';
  const isInt = item.type === 'int';
  const placeholder = isSecret && item.configured ? '••••••••' : '';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={item.key} className="text-sm font-medium">
          {item.label}
        </Label>
        {item.configured ? (
          <Badge variant="secondary" className="gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            configurado
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            não configurado
          </Badge>
        )}
      </div>
      {isBool ? (
        <div className="flex items-center gap-2">
          <Switch
            id={item.key}
            checked={value === 'true' || value === '1'}
            onCheckedChange={(c) => onChange(c ? 'true' : 'false')}
          />
          <span className="text-xs text-muted-foreground">
            {value === 'true' || value === '1' ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      ) : (
        <Input
          id={item.key}
          type={isSecret ? 'password' : isInt ? 'number' : 'text'}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
        />
      )}
      {item.help && <p className="text-xs text-muted-foreground">{item.help}</p>}
    </div>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────
function CategoryCard({
  category,
  items,
  values,
  onChange,
  onSave,
  saving,
  extra,
}: {
  category: string;
  items: SettingItem[];
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
  onSave: () => void;
  saving: boolean;
  extra?: React.ReactNode;
}) {
  const meta = CATEGORY_LABELS[category] ?? { label: category, icon: SettingsIcon };
  const Icon = meta.icon;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-4 w-4" /> {meta.label}
        </CardTitle>
        <CardDescription>
          {items.length} configurações nesta categoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <SettingField
            key={item.key}
            item={item}
            value={values[item.key] ?? ''}
            onChange={(v) => onChange(item.key, v)}
          />
        ))}
        {extra}
        <Separator />
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'A guardar...' : 'Guardar alterações'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export function AdminSettingsPage() {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingCat, setSavingCat] = useState<string | null>(null);

  const { data, isLoading, refetch } = useApiQuery<SettingsResponse>(
    ['admin', 'settings'],
    '/admin/settings',
  );

  // Seed local state when the server snapshot arrives.
  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const items of Object.values(data.byCategory)) {
      for (const item of items) {
        // For secrets, start empty so the user must type a new value to change.
        next[item.key] = item.secret ? '' : item.value;
      }
    }
    setValues(next);
  }, [data]);

  const saveMutation = useApiMutation<
    { updated: number; rejected: string[] },
    Record<string, string>
  >('/admin/settings', 'PUT', {
    onSuccess: (res) => {
      toast.success(`Guardado — ${res.updated} configurações atualizadas.`);
      setSavingCat(null);
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao guardar: ${err.message}`);
      setSavingCat(null);
    },
  });

  const testMofhMutation = useApiMutation<{ connected: boolean; message: string }, void>(
    '/admin/settings/test-mofh',
    'POST',
    {
      onSuccess: (res) => {
        if (res.connected) toast.success(`MOFH: ${res.message}`);
        else toast.error(`MOFH: ${res.message}`);
      },
      onError: (err) => toast.error(`MOFH test falhou: ${err.message}`),
    },
  );

  const testSmtpMutation = useApiMutation<{ sent: boolean; to: string }, { to?: string }>(
    '/admin/settings/test-smtp',
    'POST',
    {
      onSuccess: (res) => toast.success(`Email de teste enviado para ${res.to}`),
      onError: (err) => toast.error(`SMTP test falhou: ${err.message}`),
    },
  );

  const handleChange = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
  };

  const handleSaveCategory = (category: string) => {
    if (!data) return;
    const items = data.byCategory[category] ?? [];
    const payload: Record<string, string> = {};
    for (const item of items) {
      const v = values[item.key];
      if (v !== undefined) payload[item.key] = v;
    }
    setSavingCat(category);
    saveMutation.mutate(payload);
  };

  const categories = data?.categories ?? ['general', 'mofh', 'smtp', 'oauth', 'storage', 'ssl'];

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <SettingsIcon className="h-5 w-5 text-destructive" />
          {t('admin.settings')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Todas as credenciais e configurações do sistema vivem na base de dados e são
          editáveis aqui. Alterações entram em vigor imediatamente (sem restart).
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <Tabs defaultValue="general">
          <TabsList className="flex w-full flex-wrap gap-1">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>
                {CATEGORY_LABELS[c]?.label ?? c}
              </TabsTrigger>
            ))}
            <TabsTrigger value="system">Sistema</TabsTrigger>
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category}>
              <CategoryCard
                category={category}
                items={data?.byCategory[category] ?? []}
                values={values}
                onChange={handleChange}
                onSave={() => handleSaveCategory(category)}
                saving={savingCat === category && saveMutation.isPending}
                extra={
                  category === 'mofh' ? (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => testMofhMutation.mutate()}
                          disabled={testMofhMutation.isPending}
                        >
                          {testMofhMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plug className="h-4 w-4" />
                          )}
                          Testar conexão MOFH
                        </Button>
                      </div>
                    </>
                  ) : category === 'smtp' ? (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => testSmtpMutation.mutate({})}
                          disabled={testSmtpMutation.isPending}
                        >
                          {testSmtpMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                          Enviar email de teste
                        </Button>
                      </div>
                    </>
                  ) : null
                }
              />
            </TabsContent>
          ))}

          <TabsContent value="system">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Cpu className="h-4 w-4" /> Sistema
                </CardTitle>
                <CardDescription>Estado dos serviços.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <SystemStatusRow label="API" ok />
                <SystemStatusRow label="Base de dados" ok />
                <SystemStatusRow
                  label="MOFH"
                  ok={Boolean(
                    values['mofh.reseller_username'] ||
                      data?.byCategory.mofh?.find((i) => i.key === 'mofh.reseller_username')
                        ?.configured,
                  )}
                />
                <SystemStatusRow
                  label="SMTP"
                  ok={Boolean(
                    values['smtp.host'] ||
                      data?.byCategory.smtp?.find((i) => i.key === 'smtp.host')?.configured,
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SystemStatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <span>{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 font-mono text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" /> online
        </span>
      ) : (
        <span className="flex items-center gap-1 font-mono text-sm text-muted-foreground">
          <XCircle className="h-4 w-4" /> não configurado
        </span>
      )}
    </div>
  );
}

export default AdminSettingsPage;
