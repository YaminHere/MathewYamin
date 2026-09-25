import { auth } from "@/auth";
import WorkPage from "./work-page";

export default async function Page() {
  const session = await auth();

  const isAdmin = !!session?.user;

  return (
    <WorkPage
      isAdmin={isAdmin}
    />
  );
}