"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [username, setUsername] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [error, setError] =
    useState("");

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");

    const result = await signIn(
      "credentials",
      {
        username,
        password,
        redirect: false,
      }
    );

    if (result?.error) {
      setError("Invalid credentials.");
      return;
    }

    window.location.href = "/work";
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 p-6"
      >
        <h1 className="text-lg font-medium">
          Admin Login
        </h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          autoComplete="username"
          className="rounded border px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          autoComplete="current-password"
          className="rounded border px-3 py-2"
        />

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Login
        </button>
      </form>
    </main>
  );
}