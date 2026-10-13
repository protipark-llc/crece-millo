import { CommunityFooter, PreviewNotice } from "@/components/community/community";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PreviewNotice />
      {children}
      <CommunityFooter />
    </>
  );
}
