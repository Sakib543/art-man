import { formatTime } from "@/lib/format";
import type { FeedItem, FeedTone } from "../feed";

const DOT: Record<FeedTone, string> = {
  good: "bg-success",
  bad: "bg-destructive",
  muted: "bg-[#98a2b3]",
  brass: "bg-brass",
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="rounded-[14px] border bg-card">
      <div className="border-b px-[18px] py-3.5">
        <h2 className="text-[15px] font-semibold">Recent activity</h2>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-muted-foreground">Nothing has happened yet today</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 border-b px-[18px] py-2.5 last:border-b-0">
              <span aria-hidden className={`mt-2 size-2 shrink-0 rounded-full ${DOT[item.tone]}`} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px]">{item.text}</p>
                <p className="text-[12.5px] text-muted-foreground">{item.sub}</p>
              </div>
              <span className="text-[12.5px] text-muted-foreground tabular-nums">{formatTime(item.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
