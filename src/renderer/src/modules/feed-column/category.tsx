import { MotionButtonBase } from "@renderer/components/ui/button"
import { LoadingCircle } from "@renderer/components/ui/loading"
import { ROUTE_FEED_IN_FOLDER, views } from "@renderer/constants"
import { useNavigateEntry } from "@renderer/hooks/biz/useNavigateEntry"
import { getRouteParams, useRouteParamsSelector } from "@renderer/hooks/biz/useRouteParams"
import { useInputComposition } from "@renderer/hooks/common"
import { stopPropagation } from "@renderer/lib/dom"
import type { FeedViewType } from "@renderer/lib/enum"
import { showNativeMenu } from "@renderer/lib/native-menu"
import { cn, sortByAlphabet } from "@renderer/lib/utils"
import { useFeedStore } from "@renderer/store/feed"
import { subscriptionActions, useSubscriptionByFeedId } from "@renderer/store/subscription"
import { useFeedUnreadStore } from "@renderer/store/unread"
import { useMutation } from "@tanstack/react-query"
import { AnimatePresence, m } from "framer-motion"
import type { FC } from "react"
import { Fragment, memo, useEffect, useRef, useState } from "react"
import { useOnClickOutside } from "usehooks-ts"

import { useModalStack } from "../../components/ui/modal/stacked/hooks"
import { useFeedListSortSelector } from "./atom"
import { CategoryRemoveDialogContent } from "./category-remove-dialog"
import { FeedItem } from "./item"
import { UnreadNumber } from "./unread-number"

type FeedId = string
interface FeedCategoryProps {
  data: FeedId[]
  view?: number
  expansion: boolean
  showUnreadCount?: boolean
}

function FeedCategoryImpl({
  data: ids,
  view,
  expansion,
  showUnreadCount = true,
}: FeedCategoryProps) {
  const sortByUnreadFeedList = useFeedUnreadStore((state) =>
    ids.sort((a, b) => (state.data[b] || 0) - (state.data[a] || 0)),
  )

  const navigate = useNavigateEntry()

  const subscription = useSubscriptionByFeedId(ids[0])
  const folderName = subscription?.category || subscription.defaultCategory

  const showCollapse = sortByUnreadFeedList.length > 1 || subscription?.category
  const [open, setOpen] = useState(!showCollapse)

  const shouldOpen = useRouteParamsSelector(
    (s) => typeof s.feedId === "string" && ids.includes(s.feedId),
  )

  const itemsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shouldOpen) {
      setOpen(true)

      const $items = itemsRef.current

      if (!$items) return
      $items.querySelector(`[data-feed-id="${getRouteParams().feedId}"]`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      })
    }
  }, [shouldOpen])
  useEffect(() => {
    if (showCollapse) {
      setOpen(expansion)
    }
  }, [expansion])

  const setCategoryActive = () => {
    if (view !== undefined) {
      navigate({
        entryId: null,
        // TODO joint feedId is too long, need to be optimized
        folderName,
        view,
      })
    }
  }

  const unread = useFeedUnreadStore((state) =>
    ids.reduce((acc, feedId) => (state.data[feedId] || 0) + acc, 0),
  )

  const isActive = useRouteParamsSelector(
    (routerParams) => routerParams.feedId === `${ROUTE_FEED_IN_FOLDER}${folderName}`,
  )
  const { present } = useModalStack()

  const { mutateAsync: changeCategoryView, isPending: isChangePending } = useMutation({
    mutationKey: ["changeCategoryView", folderName, view],
    mutationFn: async (nextView: FeedViewType) => {
      if (!folderName) return
      if (typeof view !== "number") return
      return subscriptionActions.changeCategoryView(folderName, view, nextView)
    },
  })

  const [isCategoryEditing, setIsCategoryEditing] = useState(false)

  const isCategoryIsWaiting = isChangePending

  return (
    <div tabIndex={-1} onClick={stopPropagation}>
      {!!showCollapse && (
        <div
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2.5 transition-colors",
            isActive && "bg-native-active",
          )}
          onClick={(e) => {
            e.stopPropagation()
            if (!isCategoryEditing) {
              setCategoryActive()
            }
          }}
          onContextMenu={(e) => {
            showNativeMenu(
              [
                {
                  type: "text",
                  enabled: !!(folderName && typeof view === "number"),
                  label: "Change to other view",
                  submenu: views
                    .filter((v) => v.view !== view)
                    .map((v) => ({
                      label: v.name,
                      enabled: true,
                      type: "text",
                      shortcut: (v.view + 1).toString(),
                      icon: v.icon,
                      click() {
                        return changeCategoryView(v.view)
                      },
                    })),
                },
                {
                  type: "text",
                  label: "Mark as read",
                  click: () => {
                    subscriptionActions.markReadByFeedIds(ids)
                  },
                },
                { type: "separator" },
                {
                  type: "text",
                  label: "Rename category",
                  click: () => {
                    setIsCategoryEditing(true)
                  },
                },
                {
                  type: "text",
                  label: "Delete category",

                  click: async () => {
                    present({
                      title: `Delete category ${folderName}?`,
                      content: () => <CategoryRemoveDialogContent feedIdList={ids} />,
                    })
                  },
                },
              ],
              e,
            )
          }}
        >
          <div className="flex w-full min-w-0 items-center">
            <button
              type="button"
              onClick={(e) => {
                if (isCategoryEditing) return
                e.stopPropagation()
                setOpen(!open)
              }}
              data-state={open ? "open" : "close"}
              className={cn(
                "flex h-8 items-center [&_.i-mgc-right-cute-fi]:data-[state=open]:rotate-90",
              )}
              tabIndex={-1}
            >
              {isCategoryIsWaiting ? (
                <LoadingCircle size="small" className="mr-2 size-[16px]" />
              ) : isCategoryEditing ? (
                <MotionButtonBase
                  onClick={() => {
                    setIsCategoryEditing(false)
                  }}
                  className="center -ml-1 flex size-5 shrink-0 rounded-lg hover:bg-theme-button-hover"
                >
                  <i className="i-mgc-close-cute-re text-red-500 dark:text-red-400" />
                </MotionButtonBase>
              ) : (
                <div className="mr-2 size-[16px]">
                  <i className="i-mgc-right-cute-fi transition-transform" />
                </div>
              )}
            </button>
            {isCategoryEditing ? (
              <RenameCategoryForm
                currentCategory={folderName!}
                onFinished={() => setIsCategoryEditing(false)}
              />
            ) : (
              <Fragment>
                <span
                  className={cn(
                    "grow truncate",
                    !showUnreadCount && (unread ? "font-bold" : "font-medium opacity-70"),
                  )}
                >
                  {folderName}
                </span>

                <UnreadNumber unread={unread} className="ml-2" />
              </Fragment>
            )}
          </div>
        </div>
      )}
      <AnimatePresence>
        {open && (
          <m.div
            ref={itemsRef}
            className="overflow-hidden"
            initial={
              !!showCollapse && {
                height: 0,
                opacity: 0.01,
              }
            }
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0.01,
            }}
          >
            <SortedFeedItems
              ids={ids}
              showCollapse={showCollapse as boolean}
              view={view as FeedViewType}
              showUnreadCount={showUnreadCount}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const FeedCategory = memo(FeedCategoryImpl)

const RenameCategoryForm: FC<{
  currentCategory: string
  onFinished: () => void
}> = ({ currentCategory, onFinished }) => {
  const navigate = useNavigateEntry()
  const renameMutation = useMutation({
    mutationFn: async ({
      lastCategory,
      newCategory,
    }: {
      lastCategory: string
      newCategory: string
    }) => subscriptionActions.renameCategory(lastCategory, newCategory),
    onMutate({ lastCategory, newCategory }) {
      const routeParams = getRouteParams()

      if (routeParams.folderName === lastCategory) {
        navigate({
          folderName: newCategory,
        })
      }

      onFinished()
    },
  })
  const formRef = useRef<HTMLFormElement>(null)
  useOnClickOutside(
    formRef,
    () => {
      onFinished()
    },
    "mousedown",
  )
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])
  const compositionInputProps = useInputComposition({
    onKeyDown: (e) => {
      if (e.key === "Escape") {
        onFinished()
      }
    },
  })
  return (
    <form
      ref={formRef}
      className="ml-3 flex w-full items-center"
      onSubmit={(e) => {
        e.preventDefault()

        return renameMutation.mutateAsync({
          lastCategory: currentCategory!,
          newCategory: e.currentTarget.category.value,
        })
      }}
    >
      <input
        {...compositionInputProps}
        ref={inputRef}
        name="category"
        autoFocus
        defaultValue={currentCategory}
        className="w-full appearance-none bg-transparent caret-accent"
      />
      <MotionButtonBase
        type="submit"
        className="center -mr-1 flex size-5 shrink-0 rounded-lg text-green-600 hover:bg-theme-button-hover dark:text-green-400"
      >
        <i className="i-mgc-check-filled size-3" />
      </MotionButtonBase>
    </form>
  )
}

type SortListProps = {
  ids: string[]
  showUnreadCount?: boolean
  view: FeedViewType
  showCollapse: boolean
}
const SortedFeedItems = (props: SortListProps) => {
  const by = useFeedListSortSelector((s) => s.by)
  switch (by) {
    case "count": {
      return <SortByUnreadList {...props} />
    }
    case "alphabetical": {
      return <SortByAlphabeticalList {...props} />
    }

    default: {
      return <SortByUnreadList {...props} />
    }
  }
}

const SortByAlphabeticalList = (props: SortListProps) => {
  const { ids, showUnreadCount, showCollapse, view } = props
  const isDesc = useFeedListSortSelector((s) => s.order === "desc")
  const sortedFeedList = useFeedStore((state) => {
    const res = ids.sort((a, b) => {
      const feedTitleA = state.feeds[a]?.title || ""
      const feedTitleB = state.feeds[b]?.title || ""
      return sortByAlphabet(feedTitleA, feedTitleB)
    })

    if (isDesc) {
      return res
    }
    return res.reverse()
  })
  return (
    <Fragment>
      {sortedFeedList.map((feedId) => (
        <FeedItem
          showUnreadCount={showUnreadCount}
          key={feedId}
          feedId={feedId}
          view={view}
          className={showCollapse ? "pl-6" : "pl-2.5"}
        />
      ))}
    </Fragment>
  )
}
const SortByUnreadList = ({ ids, showUnreadCount, showCollapse, view }: SortListProps) => {
  const isDesc = useFeedListSortSelector((s) => s.order === "desc")
  const sortByUnreadFeedList = useFeedUnreadStore((state) => {
    const res = ids.sort((a, b) => (state.data[b] || 0) - (state.data[a] || 0))
    return isDesc ? res : res.reverse()
  })

  return (
    <Fragment>
      {sortByUnreadFeedList.map((feedId) => (
        <FeedItem
          showUnreadCount={showUnreadCount}
          key={feedId}
          feedId={feedId}
          view={view}
          className={showCollapse ? "pl-6" : "pl-2.5"}
        />
      ))}
    </Fragment>
  )
}
