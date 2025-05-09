"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@prisma/client";
import type {
  NavCollapsible,
  NavItem,
  NavLink,
  NavGroup as NavGroupType,
} from "./types";

// Map sidebar navigation items to their corresponding section keys for permissions
const NAV_ITEM_TO_SECTION_KEY: Record<string, string> = {
  "Dashboard": "dashboard",
  "Inventory": "inventory",
  "POS": "inventory",
  "Tables": "tables",
  "Finance": "finance",
  "Reports": "reports",
  "Settings": "admin",
  "Select Workspace": "admin.companies",
  "Users": "admin.users",
  "Companies": "admin.companies",
  "Roles": "admin.roles"
};

export function NavGroup({ title, items }: NavGroupType) {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { profile } = useCurrentUser();
  const { hasPermissionClient, isSuperAdmin } = useAuth();
  
  // Filter items based on user permissions
  const filteredItems = items.filter(item => {
    const itemTitle = item.title;
    
    // If it's a special "Select Workspace" item, only show for SUPERADMINs
    if (itemTitle === 'Select Workspace') {
      return isSuperAdmin;
    }
    
    // Get the appropriate section key for this navigation item
    const sectionKey = NAV_ITEM_TO_SECTION_KEY[itemTitle] || itemTitle.toLowerCase();
    
    // Check if user has 'view' permission for this section
    return hasPermissionClient(sectionKey, 'view');
  });

  // Don't render the group if there are no visible items
  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {filteredItems.map((item: NavItem) => {
          const key = `${item.title}-${item.url}`;

          if (!item.items)
            return (
              <SidebarMenuLink key={key} item={item} pathname={pathname} />
            );

          if (state === "collapsed")
            return (
              <SidebarMenuCollapsedDropdown
                key={key}
                item={item}
                pathname={pathname}
              />
            );

          return (
            <SidebarMenuCollapsible key={key} item={item} pathname={pathname} />
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

const NavBadge = ({ children }: { children: ReactNode }) => (
  <Badge className="rounded-full px-1 py-0 text-xs">{children}</Badge>
);

function isNavLink(item: NavItem): item is NavLink {
  return "url" in item;
}

const SidebarMenuLink = ({
  item,
  pathname,
}: {
  item: NavLink;
  pathname: string;
}) => {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={checkIsActive(pathname, item)}
        tooltip={item.title}
      >
        <Link href={item.url} onClick={() => setOpenMobile(false)}>
          {item.icon && <item.icon />}
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

const SidebarMenuCollapsible = ({
  item,
  pathname,
}: {
  item: NavCollapsible;
  pathname: string;
}) => {
  const { setOpenMobile } = useSidebar();
  const { hasPermissionClient } = useAuth();
  
  // Filter submenu items based on permissions
  const filteredSubItems = item.items.filter(subItem => {
    if (isNavLink(subItem)) {
      const itemTitle = subItem.title;
      // Map the submenu item to its section key
      const sectionKey = NAV_ITEM_TO_SECTION_KEY[itemTitle] || 
                         `${NAV_ITEM_TO_SECTION_KEY[item.title]}.${itemTitle.toLowerCase()}`;
      
      // Check if user has 'view' permission for this section
      return hasPermissionClient(sectionKey, 'view');
    }
    return false;
  });
  
  // Don't render the collapsible if there are no visible subitems
  if (filteredSubItems.length === 0) {
    return null;
  }
  
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(pathname, item, true)}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title}>
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="CollapsibleContent">
          <SidebarMenuSub>
            {filteredSubItems.map((subItem: NavItem) => {
              if (isNavLink(subItem)) {
                return (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={checkIsActive(pathname, subItem)}
                    >
                      <Link
                        href={subItem.url}
                        onClick={() => setOpenMobile(false)}
                      >
                        {subItem.icon && <subItem.icon />}
                        <span>{subItem.title}</span>
                        {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              }
              return null;
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const SidebarMenuCollapsedDropdown = ({
  item,
  pathname,
}: {
  item: NavCollapsible;
  pathname: string;
}) => {
  const { hasPermissionClient } = useAuth();
  
  // Filter dropdown items based on permissions
  const filteredSubItems = item.items.filter(subItem => {
    if (isNavLink(subItem)) {
      const itemTitle = subItem.title;
      // Map the dropdown item to its section key
      const sectionKey = NAV_ITEM_TO_SECTION_KEY[itemTitle] || 
                         `${NAV_ITEM_TO_SECTION_KEY[item.title]}.${itemTitle.toLowerCase()}`;
      
      // Check if user has 'view' permission for this section
      return hasPermissionClient(sectionKey, 'view');
    }
    return false;
  });
  
  // Don't render the dropdown if there are no visible subitems
  if (filteredSubItems.length === 0) {
    return null;
  }
  
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={checkIsActive(pathname, item)}
          >
            {item.icon && <item.icon />}
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ""}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {filteredSubItems.map((sub: NavItem) => {
            if (isNavLink(sub)) {
              return (
                <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
                  <Link
                    href={sub.url}
                    className={`${checkIsActive(pathname, sub) ? "bg-secondary" : ""}`}
                  >
                    {sub.icon && <sub.icon />}
                    <span className="max-w-52 text-wrap">{sub.title}</span>
                    {sub.badge && <span className="ml-auto text-xs">{sub.badge}</span>}
                  </Link>
                </DropdownMenuItem>
              );
            }
            return null;
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

function checkIsActive(pathname: string, item: NavItem, mainNav = false) {
  return (
    pathname === item.url || // /endpoint
    !!item?.items?.filter((i: NavItem) => i.url === pathname).length || // if child nav is active
    (mainNav &&
      pathname.split("/")[1] !== "" &&
      pathname.split("/")[1] === item?.url?.split("/")[1])
  );
}
