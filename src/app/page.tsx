import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/lib/auth";

// The bare address is signposts only: logged out → login, logged in → own home.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  redirect(homePathFor(user.role));
}
