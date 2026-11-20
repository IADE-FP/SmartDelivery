import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "@/services/api";

export default function SignUpForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [role, setRole] = useState<"COMPANY" | "DRIVER">("COMPANY");
  const [contact, setContact] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setMessage("Preencha todos os campos.");
      setIsError(true);
      return;
    }

    if (password.length < 10) {
      setMessage("A palavra-passe deve ter pelo menos 10 caracteres.");
      setIsError(true);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("As palavras-passe não coincidem.");
      setIsError(true);
      return;
    }

    if (!acceptedTerms) {
      setMessage("Aceite os termos e condições para continuar.");
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const registration = role === "COMPANY"
        ? { name: name.trim(), email: email.trim(), password, contact: contact || null }
        : { full_name: name.trim(), email: email.trim(), password, contact: contact || null, identity_number: identityNumber || null };
      await api.post(role === "COMPANY" ? "/auth/company/register" : "/auth/driver/register", registration);
      setMessage("Conta criada. A redirecionar para iniciar sessão…");
      setIsError(false);
      window.setTimeout(() => navigate("/signin", { replace: true }), 900);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Não foi possível criar a conta.");
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "h-12 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:text-white";

  const labelClass =
    "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white">
          Criar conta
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400">
          Preencha os seus dados para criar uma conta na SMART DELIVERY.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="account-role" className={labelClass}>Tipo de conta</label>
          <select id="account-role" value={role} onChange={(event) => setRole(event.target.value as "COMPANY" | "DRIVER")} className={inputClass}>
            <option value="COMPANY">Empresa</option>
            <option value="DRIVER">Motorista</option>
          </select>
        </div>

        <div>
          <label htmlFor="name" className={labelClass}>
            {role === "COMPANY" ? "Nome da empresa" : "Nome completo"}
          </label>

          <input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Introduza o seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-contact" className={labelClass}>Contacto (opcional)</label>
          <input id="signup-contact" type="tel" value={contact} onChange={(event) => setContact(event.target.value)} className={inputClass} placeholder="Telefone" />
        </div>

        {role === "DRIVER" && <div><label htmlFor="identity-number" className={labelClass}>N.º de identificação (opcional)</label><input id="identity-number" value={identityNumber} onChange={(event) => setIdentityNumber(event.target.value)} className={inputClass} /></div>}

        <div>
          <label htmlFor="signup-email" className={labelClass}>
            E-mail
          </label>

          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="exemplo@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="signup-password" className={labelClass}>
            Palavra-passe
          </label>

          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mínimo de 10 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputClass} pr-24`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm-password" className={labelClass}>
            Confirmar palavra-passe
          </label>

          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Repita a palavra-passe"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            id="terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />

          <label
            htmlFor="terms"
            className="cursor-pointer text-sm text-gray-600 dark:text-gray-400"
          >
            Li e aceito os termos e condições da SMART DELIVERY.
          </label>
        </div>

        {message && (
          <div
            role="alert"
            className={`rounded-lg border px-4 py-3 text-sm ${
              isError
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                : "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
            }`}
          >
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isSubmitting ? "A criar conta…" : "Criar conta"}
        </button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Já tem uma conta?{" "}
          <Link
            to="/signin"
            className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Iniciar sessão
          </Link>
        </p>
      </form>
    </div>
  );
}
