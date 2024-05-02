import { useSubscriptions } from "@renderer/lib/subscriptions"
import {
  Collapsible,
  CollapsibleTrigger,
} from "@renderer/components/ui/collapsible"
import { m, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { levels, views } from "@renderer/lib/constants"
import { ActivedList } from "@renderer/lib/types"
import { cn } from "@renderer/lib/utils"
import { SiteIcon } from "../site-icon"
import { Response as SubscriptionsResponse } from "@renderer/lib/subscriptions"

export function FeedList({
  className,
  view,
  activedList,
  setActivedList,
  hideTitle,
}: {
  className?: string
  view?: number
  activedList?: ActivedList
  setActivedList?: (value: ActivedList) => void
  hideTitle?: boolean
}) {
  const subscriptions = useSubscriptions(view)

  return (
    <div className={className}>
      {!hideTitle && (
        <div
          className={cn(
            "flex items-center justify-between mb-2 px-2.5 py-1 cursor-pointer",
          )}
          onClick={(e) => {
            e.stopPropagation()
            view !== undefined &&
              setActivedList?.({
                level: levels.view,
                id: view,
                name: views[view].name,
                view,
              })
          }}
        >
          <div className="font-bold">
            {view !== undefined && views[view].name}
          </div>
          <div className="text-sm text-zinc-500 ml-2">
            {subscriptions.data?.unread}
          </div>
        </div>
      )}
      {subscriptions.data?.list.map((category) => (
        <FeedCategory
          key={category.name}
          data={category}
          activedList={activedList}
          setActivedList={setActivedList}
          view={view}
        />
      ))}
    </div>
  )
}

function FeedCategory({
  data,
  activedList,
  setActivedList,
  view,
}: {
  data: SubscriptionsResponse["list"][number]
  activedList?: ActivedList
  setActivedList?: (value: ActivedList) => void
  view?: number
}) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible
      open={open}
      onOpenChange={(o) => setOpen(o)}
      onClick={(e) => {
        e.stopPropagation()
        view !== undefined &&
          setActivedList?.({
            level: levels.folder,
            id: data.name,
            name: data.name,
            view,
          })
      }}
    >
      <div
        className={cn(
          "flex items-center justify-between font-medium text-sm leading-loose px-2.5 py-[2px] rounded-md w-full cursor-pointer transition-colors",
          activedList?.level === levels.folder &&
            activedList.id === data.name &&
            "bg-[#C9C9C7]",
        )}
      >
        <div className="flex items-center min-w-0 w-full">
          <CollapsibleTrigger
            className={cn(
              "flex items-center h-7 [&_.i-mingcute-right-fill]:data-[state=open]:rotate-90",
              !setActivedList && "flex-1",
            )}
          >
            <i className="i-mingcute-right-fill mr-2 transition-transform" />
            {!setActivedList && <span className="truncate">{data.name}</span>}
          </CollapsibleTrigger>
          {setActivedList && <span className="truncate">{data.name}</span>}
        </div>
        {!!data.unread && (
          <div className="text-xs text-zinc-500 ml-2">{data.unread}</div>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <m.div
            className="overflow-hidden"
            initial={{
              height: 0,
              opacity: 0.01,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0.01,
            }}
          >
            {data.list.map((feed) => (
              <div
                key={feed.feedId}
                className={cn(
                  "flex items-center justify-between text-sm font-medium leading-loose w-full pl-6 pr-2.5 py-[2px] rounded-md cursor-pointer",
                  activedList?.level === levels.feed &&
                    activedList.id === feed.feedId &&
                    "bg-[#C9C9C7]",
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  view !== undefined &&
                    setActivedList?.({
                      level: levels.feed,
                      id: feed.feedId,
                      name: feed.feeds.title,
                      view,
                    })
                }}
              >
                <div className="flex items-center min-w-0">
                  <SiteIcon url={feed.feeds.siteUrl} className="w-4 h-4" />
                  <div className="truncate">{feed.feeds.title}</div>
                </div>
                {!!feed.unread && (
                  <div className="text-xs text-zinc-500 ml-2">
                    {feed.unread}
                  </div>
                )}
              </div>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </Collapsible>
  )
}