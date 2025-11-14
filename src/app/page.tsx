import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to dashboard (will handle auth there)
  redirect("/dashboard");
}
