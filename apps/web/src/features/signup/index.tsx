"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAuthContext } from "@/providers/Auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { googleAuthDisabled } from "@/lib/utils";

// Form validation schema
const signupSchema = z
  .object({
    firstName: z.string().min(1, "Nome é obrigatório"),
    lastName: z.string().min(1, "Sobrenome é obrigatório"),
    companyName: z.string().optional(),
    email: z.string().email("Por favor, insira um email válido"),
    password: z
      .string()
      .min(8, "Senha deve ter pelo menos 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupInterface() {
  const { signUp, signInWithGoogle } = useAuthContext();
  const router = useRouter();

  const [formValues, setFormValues] = useState<Partial<SignupFormValues>>({
    firstName: "",
    lastName: "",
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof SignupFormValues, string>>
  >({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const validateForm = () => {
    try {
      signupSchema.parse(formValues);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof SignupFormValues, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as keyof SignupFormValues] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await signUp({
        email: formValues.email!,
        password: formValues.password!,
        metadata: {
          first_name: formValues.firstName,
          last_name: formValues.lastName,
          company_name: formValues.companyName || null,
          name: `${formValues.firstName} ${formValues.lastName}`.trim(),
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      // On success, redirect to a confirmation page or dashboard
      router.push(
        "/signin?message=Por favor, verifique seu email para confirmar sua conta",
      );
    } catch (error) {
      console.error("Signup error:", error);
      setAuthError("Um erro inesperado ocorreu. Por favor, tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    setAuthError(null);

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        setAuthError(error.message);
      }
      // The redirect will be handled by the OAuth provider
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      setAuthError("Um erro ocorreu ao fazer login com Google.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Criar uma Conta
          </CardTitle>
          <CardDescription className="text-center">
            Cadastre-se para usar a Plataforma de Agentes da VIA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="João"
                  value={formValues.firstName || ""}
                  onChange={handleInputChange}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <p className="text-destructive text-sm">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Silva"
                  value={formValues.lastName || ""}
                  onChange={handleInputChange}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <p className="text-destructive text-sm">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">
                Nome da Empresa{" "}
                <span className="text-muted-foreground text-xs">
                  (Opcional)
                </span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                placeholder="Nome da sua empresa"
                value={formValues.companyName || ""}
                onChange={handleInputChange}
                aria-invalid={!!errors.companyName}
              />
              {errors.companyName && (
                <p className="text-destructive text-sm">{errors.companyName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="nome@exemplo.com"
                value={formValues.email || ""}
                onChange={handleInputChange}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-destructive text-sm">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Crie uma senha"
                value={formValues.password || ""}
                onChange={handleInputChange}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-destructive text-sm">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirme sua senha"
                value={formValues.confirmPassword || ""}
                onChange={handleInputChange}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              variant="brand"
              disabled={isLoading}
            >
              {isLoading ? "Criando Conta..." : "Criar Conta"}
            </Button>
          </form>

          {!googleAuthDisabled() && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card text-muted-foreground px-2">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                type="button"
                className="flex w-full items-center justify-center gap-2"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"></path>
                </svg>
                Sign up with Google
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-muted-foreground text-sm">
            Já possui uma conta?{" "}
            <Link
              href="/signin"
              className="text-primary font-medium hover:underline"
            >
              Faça login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
