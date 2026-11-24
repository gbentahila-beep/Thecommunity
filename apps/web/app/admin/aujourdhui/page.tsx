import { redirect } from "next/navigation";

/** Back-office simplifié (24/11) : « Aujourd'hui » est réuni avec le tableau de bord dans « À faire ». */
export default function TodayPage() {
  redirect("/admin");
}
