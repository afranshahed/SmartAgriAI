import { redirect } from "next/navigation";

// Kept only so existing bookmarks use the consolidated Gardens hub.
export default function MyGardensPage() {
  redirect("/gardens");
}
