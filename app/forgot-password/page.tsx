"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      alert(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Reset Password</CardTitle>
          <p className="text-center text-sm text-foreground/70">
            {sent ? "Check your email for reset link" : "Enter your email to reset password"}
          </p>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                id="email"
                label="Email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" glow className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="text-success mb-4">Reset link sent to your email!</p>
              <Link href="/login">
                <Button variant="secondary" className="w-full">Back to Login</Button>
              </Link>
            </div>
          )}
          
          <p className="text-center text-sm text-foreground/70 mt-6">
            Remember your password?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
