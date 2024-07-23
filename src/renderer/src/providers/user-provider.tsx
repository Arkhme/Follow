import { useSetMe } from "@renderer/atoms/user"
import { useSession } from "@renderer/queries/auth"
import { CleanerService } from "@renderer/services/cleaner"
import { useEffect } from "react"

export const UserProvider = () => {
  const { session } = useSession()
  const setUser = useSetMe()
  useEffect(() => {
    if (!session?.user) return
    setUser(session.user)

    window.posthog?.identify(session.user.id, {
      name: session.user.name,
      handle: session.user.handle,
    })

    CleanerService.cleanRemainingData(session.user.id)
  }, [session?.user, setUser])

  return null
}
