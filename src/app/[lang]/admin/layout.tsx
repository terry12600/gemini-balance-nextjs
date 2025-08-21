import { getSession } from "@/app/auth/actions";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/get-dictionary";
import { redirect } from "next/navigation";
import AdminClientLayout from "./AdminClientLayout";

export default async function AdminLayout({
  children,
  params: paramsPromise,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await paramsPromise;
  const session = await getSession();

  // The middleware should handle redirection for non-authenticated users,
  // but we add a fallback here for extra security.
  if (!session) {
    redirect(`/${lang}/auth`);
  }

  const dictionary = await getDictionary(lang);

  // If validation passes, render the client layout and the page content.
  return (
    <AdminClientLayout dictionary={dictionary} lang={lang}>
      {children}
    </AdminClientLayout>
  );
}
