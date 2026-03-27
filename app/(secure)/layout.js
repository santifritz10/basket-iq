import { redirect } from "next/navigation";

export default async function SecureLayout({ children }) {
  void children;
  redirect("/legacy/index.html");
}
