import WebsiteAuth from "@/components/website-auth";
export const metadata = { title: "Verify your email | CYPHERFX" };
export default function Page() {
  return <WebsiteAuth mode="verify" />;
}
