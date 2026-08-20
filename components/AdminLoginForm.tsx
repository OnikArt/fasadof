"use client";

import { FormEvent, useState } from "react";

export function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Не удалось войти");
      }

      window.location.assign("/admin/support");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        Email / login
        <input autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label>
        Password
        <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <button className="btn primary" disabled={loading} type="submit">
        {loading ? "Проверяем" : "Войти"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  );
}
