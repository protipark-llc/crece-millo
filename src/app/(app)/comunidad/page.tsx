import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/primitives";
import { AvatarStack, Composer, LiveEventCard, PostCard, RulesCard } from "@/components/community/community";
import { COMMUNITY_RULES, SAMPLE_COMMUNITY, SAMPLE_POSTS } from "@/lib/community/sample";

export const metadata: Metadata = { title: "Muro · Comunidad" };

export default function WallPage() {
  return (
    <>
      <PageHeader
        eyebrow="Comunidad"
        title="Muro"
        description="Avances, dudas y aprendizajes de la comunidad. Compartimos números reales, sin promesas."
        actions={<AvatarStack initials={SAMPLE_COMMUNITY.avatars} label={<>{SAMPLE_COMMUNITY.members.toLocaleString("es-CO")} miembros (ejemplo)</>} />}
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Composer locked />
          {SAMPLE_POSTS.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
        <aside className="space-y-4">
          <LiveEventCard event={SAMPLE_COMMUNITY.event} />
          <RulesCard rules={COMMUNITY_RULES} />
        </aside>
      </div>
    </>
  );
}
