import WebsiteAuth from "@/components/website-auth";
export const metadata = { title: "Reset your password | CYPHERFX" };
export default function Page() {
  return <WebsiteAuth mode="forgot" />;
}
