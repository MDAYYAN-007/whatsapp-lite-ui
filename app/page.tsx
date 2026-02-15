"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

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
        setUsername(data.username);
      })
      .catch(() => {
        setAuthenticated(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-linear-to-br from-blue-900/40 via-purple-900/30 to-black" />
      <div className="absolute w-150 h-150 bg-blue-500/20 blur-3xl rounded-full -top-25 -left-25 animate-pulse" />
      <div className="absolute w-125 h-125 bg-purple-500/20 blur-3xl rounded-full -bottom-25 -right-25 animate-pulse" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-6xl font-bold tracking-tight mb-6">
            WhatsApp Lite
          </h1>

          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            A real-time messaging system built with Go, WebSockets, concurrency
            patterns, and production-level backend design.
          </p>
        </div>

        {/* Feature Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-20 text-center">
          <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur">
            <h3 className="text-lg font-semibold mb-2">Real-Time Messaging</h3>
            <p className="text-gray-400 text-sm">
              Concurrent message broadcasting using goroutines and channels.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur">
            <h3 className="text-lg font-semibold mb-2">Room & Private Chat</h3>
            <p className="text-gray-400 text-sm">
              Room-based chat plus private messaging with in-memory history.
            </p>
          </div>

          <div className="p-6 bg-white/5 border border-white/10 rounded-xl backdrop-blur">
            <h3 className="text-lg font-semibold mb-2">Graceful Shutdown</h3>
            <p className="text-gray-400 text-sm">
              Clean disconnect handling and production-ready architecture.
            </p>
          </div>
        </div>

        {/* Auth Section */}
        <div className="text-center">
          {loading ? (
            <p className="text-gray-400">Checking authentication...</p>
          ) : authenticated ? (
            <div>
              <p className="mb-6 text-lg text-green-400">
                Welcome back, {username}
              </p>

              <a
                href="/chat"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Continue to Chat
              </a>
            </div>
          ) : (
            <div className="space-x-4">
              <a
                href="/login"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                Login
              </a>

              <a
                href="/register"
                className="px-8 py-3 border border-blue-500 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
              >
                Register
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
