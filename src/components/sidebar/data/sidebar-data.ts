import {
  AlertCircle,
  AppWindow,
  AudioWaveform,
  Ban,
  BellRing,
  Monitor,
  Bug,
  CheckSquare,
  Command,
  GalleryVerticalEnd,
  HelpCircle,
  LayoutDashboard,
  Lock,
  LockKeyhole,
  MessageSquare,
  Palette,
  Settings,
  ServerCrash,
  Wrench,
  UserCog,
  UserX,
  Users,
  Building2,
  BuildingIcon,
  Factory,
  Package,
  ShoppingCart,
  Table,
  Wallet,
} from "lucide-react";
import type { SidebarData } from "../types";
import { UserRole } from "@prisma/client";

export const sidebarData: SidebarData = {
  user: {
    name: "satnaing",
    email: "satnaingdev@gmail.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Shadcn Admin",
      logo: Command,
      plan: "Vite + ShadcnUI",
    },
    {
      name: "Acme Inc",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: AudioWaveform,
      plan: "Startup",
    },
  ],
  navGroups: [
    {
      title: "General",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Pages",
      items: [
        {
          title: "Inventory",
          url: "/dashboard/inventory",
          icon: Package,
        },
        {
          title: "POS",
          url: "/dashboard/pos",
          icon: ShoppingCart,
        },
        {
          title: "Tables",
          url: "/dashboard/tables",
          icon: Table,
        },
        {
          title: "Finance",
          url: "/dashboard/finance/transactions",
          icon: Wallet,
        },
      ],
    },
    {
      title: "Other",
      items: [
        {
          title: "Settings",
          icon: Settings,
          url: "/dashboard/settings",
          requiredRole: UserRole.ADMIN,
        },
        {
          title: "Help Center",
          url: "/dashboard/help",
          icon: HelpCircle,
        },
      ],
    },
  ],
};
