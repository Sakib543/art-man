import { Panel, PanelHeader } from "@/components/panel";
import { formatTime } from "@/lib/format";
import type { FeedItem, FeedTone } from "../feed";

const DOT: Record<FeedTone, string> = {
  good: "bg-success",
  bad: "bg-destructive",
  muted: "bg-muted-foreground/70",
  brass: "bg-brass",
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <Panel>
      <PanelHeader title="Recent activity" />
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-muted-foreground">Nothing has happened yet today</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 border-b px-card py-2.5 last:border-b-0">
              <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${DOT[item.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{item.text}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(item.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
