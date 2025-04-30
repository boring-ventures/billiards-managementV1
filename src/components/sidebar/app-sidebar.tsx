import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavGroup } from "./nav-group";
import { NavUser } from "./nav-user";
import { TeamSwitcher } from "./team-switcher";
import { CompanyTeamSwitcher } from "./company-team-switcher";
import { sidebarData } from "./data/sidebar-data";
import type { NavGroupProps } from "./types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { UserRole } from "@prisma/client";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile } = useCurrentUser();
  const isSuperadmin = profile?.role === UserRole.SUPERADMIN;

  return (
    <Sidebar collapsible="icon" variant="floating" {...props}>
      <SidebarHeader>
        {isSuperadmin ? (
          <CompanyTeamSwitcher />
        ) : (
          <TeamSwitcher teams={sidebarData.teams} />
        )}
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props: NavGroupProps) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
