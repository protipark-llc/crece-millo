import { CommunityFooter } from "@/components/community/community";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommunityFooter />
    </>
  );
}
