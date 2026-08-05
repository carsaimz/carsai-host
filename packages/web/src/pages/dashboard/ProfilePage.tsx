import { useTranslation } from 'react-i18next';
import { User, Save, Globe2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useLocale } from '@/hooks/useLocale';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '@carsai/shared';

/** ProfilePage — info pessoal + idioma + timezone. */
export function ProfilePage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const { locale, setLocale } = useLocale();

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <User className="h-5 w-5 text-primary" />
          {t('profile.title')}
        </h1>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">{t('profile.personalInfo')}</TabsTrigger>
          <TabsTrigger value="preferences">{t('profile.preferences')}</TabsTrigger>
        </TabsList>

        {/* Personal info */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('profile.personalInfo')}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" defaultValue={user?.firstName ?? ''} placeholder="Nome" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apelido</Label>
                  <Input id="lastName" defaultValue={user?.lastName ?? ''} placeholder="Apelido" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{t('common.username')}</Label>
                <Input id="username" defaultValue={user?.username ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input id="email" type="email" defaultValue={user?.email ?? ''} disabled />
              </div>
              <Button>
                <Save className="h-4 w-4" />
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('profile.preferences')}</CardTitle>
              <CardDescription>Idioma e fuso horario.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('profile.language')}</Label>
                <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LOCALES.map((l) => (
                      <SelectItem key={l} value={l}>
                        <span className="mr-2">{LOCALE_LABELS[l].flag}</span>
                        {LOCALE_LABELS[l].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="timezone">{t('profile.timezone')}</Label>
                <Input id="timezone" defaultValue={user?.timezone ?? 'Europe/Lisbon'} />
              </div>
              <Button>
                <Globe2 className="h-4 w-4" />
                {t('common.save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ProfilePage;
