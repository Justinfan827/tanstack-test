import { useRouter } from '@tanstack/react-router'
import { ChevronUp, Loader2, LogOut, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useSignOut } from '@/hooks/use-sign-out'

export function NavUser() {
  const { isMobile } = useSidebar()
  const { signOut, isPending } = useSignOut()
  const router = useRouter()

  // TODO: Replace with real Convex query when user schema exists
  // const user = useQuery(api.users.getCurrentUser)
  const user = {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@example.com',
    avatarURL: undefined,
  }

  if (!user) {
    return null
  }

  const name = `${user.firstName} ${user.lastName}`

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                {...props}
              >
                <Avatar className="h-8 w-8 rounded-lg grayscale">
                  <AvatarImage alt={name} src={user.avatarURL} />
                  <AvatarFallback className="rounded-lg">
                    {name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-muted-foreground text-xs">
                    {user.email}
                  </span>
                </div>
                <ChevronUp className="ml-auto size-4" />
              </SidebarMenuButton>
            )}
          />
          <DropdownMenuContent
            align="start"
            className="w-(--anchor-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'top'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage alt={name} src={user.avatarURL} />
                    <AvatarFallback className="rounded-lg">
                      {name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{name}</span>
                    <span className="truncate text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  router.navigate({ to: '/home/settings/exercises/library' })
                }}
              >
                <User />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              aria-label="Log out"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault()
                signOut()
              }}
            >
              <LogOut />
              Log out
              {isPending && <Loader2 className="animate-spin" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
