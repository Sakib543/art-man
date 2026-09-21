import { redirect } from "next/navigation";

// The counter is the default landing screen (see the spec, section 2).
export default function Home() {
  redirect("/billing");
}
