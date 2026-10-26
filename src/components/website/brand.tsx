import Link from "next/link";
export function WebBrand() {
  return (
    <Link href="/" className="web-brand" aria-label="CYPHERFX home">
      <span className="web-brand-mark" />
      <span>
        CYPHER<span>FX</span>
      </span>
    </Link>
  );
}
