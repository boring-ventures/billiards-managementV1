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
        {
          title: "Companies",
          url: "/companies",
          icon: Building2,
        },
        {
          title: "Select Workspace", 
          url: "/select-company",
          icon: Factory,
          requiredRole: UserRole.SUPERADMIN,
        },
        {
          title: "Apps",
          url: "/apps",
          icon: AppWindow,
        },
        {
          title: "Chats",
          url: "/chats",
          badge: "3",
          icon: MessageSquare,
        },
        {
          title: "Users",
          url: "/users",
          icon: Users,
        },
      ],
    },
    {
      title: "Pages",
      items: [
        {
          title: "Auth",
          icon: Lock,
          items: [
            {
              title: "Sign In",
              url: "/sign-in",
            },
            {
              title: "Sign In (2 Col)",
              url: "/sign-in-2",
            },
            {
              title: "Sign Up",
              url: "/sign-up",
            },
            {
              title: "Forgot Password",
              url: "/forgot-password",
            },
            {
              title: "OTP",
              url: "/otp",
            },
          ],
        },
        {
          title: "Errors",
          icon: Bug,
          items: [
            {
              title: "Unauthorized",
              url: "/401",
              icon: LockKeyhole,
            },
            {
              title: "Forbidden",
              url: "/403",
              icon: UserX,
            },
            {
              title: "Not Found",
              url: "/404",
              icon: AlertCircle,
            },
            {
              title: "Internal Server Error",
              url: "/500",
              icon: ServerCrash,
            },
            {
              title: "Maintenance Error",
              url: "/503",
              icon: Ban,
            },
          ],
        },
      ],
    },
    {
      title: "Other",
      items: [
        {
          title: "Settings",
          icon: Settings,
          url: "/settings",
        },
        {
          title: "Help Center",
          url: "/help-center",
          icon: HelpCircle,
        },
      ],
    },
  ],
};
