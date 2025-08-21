import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { getSettings } from "@/lib/settings";
import LoginForm from "./LoginForm";

export default async function AuthPage({
  params,
}: {
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const settings = await getSettings();
  const isInitialSetup = !settings.ADMIN_PASSWORD_HASH;

  return (
    <LoginForm
      dictionary={dictionary.loginForm}
      isInitialSetup={isInitialSetup}
    />
  );
}
