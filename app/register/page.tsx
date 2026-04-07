"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const usernameRegex = /^[a-zA-Z0-9_]{4,20}$/;
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  useEffect(() => {
    fetch("http://localhost:8080/me", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setAuthenticated(true);
        setCurrentUser(data.username);
      })
      .catch(() => setAuthenticated(false))
      .finally(() => setCheckingAuth(false));
  }, []);

  const validate = () => {
    if (!usernameRegex.test(username)) {
      return "Username must be 4–20 characters (letters, numbers, underscore only).";
    }

    if (!passwordRegex.test(password)) {
      return "Password must be 8+ characters with at least 1 letter, 1 number and 1 special character.";
    }

    return "";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8080/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      setAuthenticated(true);
      setCurrentUser(username);
      router.push("/chat");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("http://localhost:8080/logout", {
      method: "POST",
      credentials: "include",
    });

    setAuthenticated(false);
    setCurrentUser("");
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center text-white">
        Checking authentication...
      </main>
    );
  }

  const showUsernameError = submitted && !usernameRegex.test(username);

  const showPasswordError = submitted && !passwordRegex.test(password);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-black" />
      <div className="absolute w-[600px] h-[600px] bg-purple-500/20 blur-3xl rounded-full top-[-150px] left-[-150px] animate-pulse" />
      <div className="absolute w-[500px] h-[500px] bg-blue-500/20 blur-3xl rounded-full bottom-[-150px] right-[-150px] animate-pulse" />

      <div className="relative z-10 grid md:grid-cols-2 min-h-screen">
        {/* Left Branding */}
        <div className="hidden md:flex flex-col justify-center px-20">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Create Account
          </h1>

          <p className="text-gray-300 text-lg mb-12 leading-relaxed">
            Join and explore scalable real-time messaging powered by Go
            concurrency and WebSocket communication.
          </p>

          <Feature
            color="purple"
            title="Instant Setup"
            desc="Register and start chatting immediately."
          />
          <Feature
            color="blue"
            title="Secure Authentication"
            desc="JWT-based cookie authentication system."
          />
          <Feature
            color="indigo"
            title="Private Conversations"
            desc="Real-time private messaging with history."
          />
        </div>

        {/* Right Panel */}
        <div className="flex items-center justify-center px-6">
          <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
            {authenticated ? (
              <>
                <h2 className="text-2xl font-bold mb-8 text-center">
                  Logged in as{" "}
                  <span className="text-purple-400">{currentUser}</span>
                </h2>

                <div className="space-y-4">
                  <button
                    onClick={() => router.push("/chat")}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 py-3 rounded-xl transition cursor-pointer active:scale-95"
                  >
                    Continue to Chat
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full border border-red-500 text-red-400 hover:bg-red-500/10 py-3 rounded-xl transition cursor-pointer active:scale-95"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Register
                </h2>

                <form onSubmit={handleRegister} className="space-y-5">
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full p-3 rounded-xl bg-black/40 border ${
                      showUsernameError ? "border-red-500" : "border-white/20"
                    } focus:outline-none focus:border-purple-500 transition`}
                  />

                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full p-3 rounded-xl bg-black/40 border ${
                      showPasswordError ? "border-red-500" : "border-white/20"
                    } focus:outline-none focus:border-blue-500 transition`}
                  />

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 py-3 rounded-xl transition cursor-pointer active:scale-95"
                  >
                    {loading ? "Creating account..." : "Register"}
                  </button>
                </form>

                <p className="mt-8 text-center text-gray-400 text-sm">
                  Already have an account?{" "}
                  <a
                    href="/login"
                    className="text-purple-400 hover:underline cursor-pointer"
                  >
                    Login
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Feature({
  color,
  title,
  desc,
}: {
  color: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-5 mb-8">
      <div
        className={`w-4 h-4 mt-2 rounded-full bg-${color}-500 shadow-lg shadow-${color}-500/40 animate-pulse`}
      />
      <div>
        <h4 className="font-semibold text-xl">{title}</h4>
        <p className="text-gray-400 text-sm mt-1">{desc}</p>
      </div>
    </div>
  );
}
