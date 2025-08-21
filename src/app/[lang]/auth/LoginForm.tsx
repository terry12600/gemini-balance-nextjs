"use client";

import { login, setInitialPassword } from "@/app/auth/actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Dictionary } from "@/lib/dictionaries";
import { Suspense, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type FormState = {
  error?: string;
  success?: boolean;
};

function SubmitButton({
  disabled,
  dictionary,
  isInitialSetup,
}: {
  disabled: boolean;
  dictionary: Dictionary["loginForm"];
  isInitialSetup: boolean;
}) {
  const { pending } = useFormStatus();
  const buttonText = isInitialSetup
    ? dictionary.setInitialPassword
    : dictionary.signIn;
  const pendingText = isInitialSetup
    ? dictionary.settingPassword
    : dictionary.signingIn;

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
    >
      {pending ? pendingText : buttonText}
    </button>
  );
}

export default function LoginForm({
  dictionary,
  isInitialSetup,
}: {
  dictionary: Dictionary["loginForm"];
  isInitialSetup: boolean;
}) {
  const action = isInitialSetup ? setInitialPassword : login;
  
  const formActionWrapper = async (state: FormState, payload: FormData): Promise<FormState> => {
    const password = payload.get("password") as string;
    return action(password);
  };

  const [state, formAction] = useActionState<FormState, FormData>(formActionWrapper, {});
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (state?.success) {
      window.location.href = "/admin";
    }
  }, [state]);

  const passwordsMatch = password === confirmPassword;
  const isSubmitDisabled = isInitialSetup
    ? !password || !passwordsMatch
    : !password;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isInitialSetup ? dictionary.initialSetupTitle : dictionary.title}
          </h1>
          <Suspense fallback={<div className="w-10 h-10" />}>
            <LanguageSwitcher />
          </Suspense>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              {isInitialSetup
                ? dictionary.newPasswordLabel
                : dictionary.passwordLabel}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          {isInitialSetup && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                {dictionary.confirmPasswordLabel}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              {!passwordsMatch && confirmPassword && (
                <p className="text-sm text-red-600 mt-1">
                  {dictionary.passwordsDoNotMatch}
                </p>
              )}
            </div>
          )}

          {state?.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <div>
            <SubmitButton
              disabled={isSubmitDisabled}
              dictionary={dictionary}
              isInitialSetup={isInitialSetup}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
