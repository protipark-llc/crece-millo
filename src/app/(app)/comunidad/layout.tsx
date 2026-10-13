import { CommunityFooter } from "@/components/community/community";
import { CommunityFooterGate } from "@/components/community/community-footer";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommunityFooterGate>
        <CommunityFooter />
      </CommunityFooterGate>
    </>
  );
}
