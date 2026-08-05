import { useTranslation } from 'react-i18next';
import { Settings, Save, Server, Mail, Cpu } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

/** AdminSettingsPage — definicoes do sistema. */
export function AdminSettingsPage() {
  const { t } = useTranslation();

  const handleSave = () => toast.success(t('success.saved'));

  return (
    <div className="page-container max-w-4xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-5 w-5 text-destructive" />
          {t('admin.settings')}
        </h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="mofh">MOFH</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Definicoes gerais</CardTitle>
              <CardDescription>Nome da aplicacao, URL, locale padrao.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="appName">Nome da aplicacao</Label>
                <Input id="appName" defaultValue="CARSAI HOST" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appUrl">URL</Label>
                <Input id="appUrl" defaultValue="https://carsai.host" />
              </div>
              <Button onClick={handleSave}><Save className="h-4 w-4" /> {t('common.save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mofh">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Server className="h-4 w-4" /> MOFH (iFastNet / Byet)
              </CardTitle>
              <CardDescription>Credenciais do reseller.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mofhUser">Reseller username</Label>
                <Input id="mofhUser" placeholder="reseller_user" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mofhPass">Reseller password</Label>
                <Input id="mofhPass" type="password" placeholder="••••••••" />
              </div>
              <Separator />
              <Button onClick={handleSave}><Save className="h-4 w-4" /> {t('common.save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="smtp">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-4 w-4" /> SMTP
              </CardTitle>
              <CardDescription>Configuracao de envio de email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">Host</Label>
                  <Input id="smtpHost" defaultValue="smtp.gmail.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">Porta</Label>
                  <Input id="smtpPort" type="number" defaultValue={587} />
                </div>
              </div>
              <Button onClick={handleSave}><Save className="h-4 w-4" /> {t('common.save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cpu className="h-4 w-4" /> Sistema
              </CardTitle>
              <CardDescription>Estado dos servicos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>API</span>
                <span className="font-mono text-success">online</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>Base de dados</span>
                <span className="font-mono text-success">online</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>MOFH</span>
                <span className="font-mono text-muted-foreground">nao configurado</span>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <span>SMTP</span>
                <span className="font-mono text-muted-foreground">nao configurado</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminSettingsPage;
