import { redirect } from "next/navigation";

/** Back-office simplifié (24/11) : la liste des dates est le « Programme ». */
export default function SessionsPage() {
  redirect("/admin/programme");
}
