import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In or Get Started",
  description:
    "Sign in or create your Wave Tech candidate account to analyze your resume, discover matched roles, and track applications.",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
