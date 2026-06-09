export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-surface-dark p-6 scrollbar-thin">
      {children}
    </div>
  );
}
