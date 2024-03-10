import "styles/globals.css";
import "styles/style.css";

export default async function PostLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <>{children}</>
  );
}
