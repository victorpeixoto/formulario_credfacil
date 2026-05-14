import NavHeader from '@/components/portal/nav-header';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <NavHeader />
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
}
