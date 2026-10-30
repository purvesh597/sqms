import {
  BarChart3,
  Bell,
  ClipboardList,
  History,
  LayoutDashboard,
  ListOrdered,
  Store,
  Ticket,
  TicketPlus,
  UserCog,
  Users,
  UtensilsCrossed,
  Clock3,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '../types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAVIGATION: Record<Role, NavSection[]> = {
  STUDENT: [
    {
      items: [
        { to: '/student', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { to: '/student/generate', label: 'Generate Token', icon: TicketPlus },
        { to: '/student/tokens', label: 'My Tokens', icon: Ticket },
        { to: '/student/menu', label: "Today's Menu", icon: UtensilsCrossed },
        { to: '/student/notifications', label: 'Notifications', icon: Bell },
      ],
    },
  ],
  STAFF: [
    {
      items: [
        { to: '/staff', label: 'Live Queue', icon: ListOrdered, end: true },
        { to: '/staff/activity', label: 'Activity Log', icon: History },
        { to: '/staff/menu', label: "Today's Menu", icon: UtensilsCrossed },
      ],
    },
  ],
  ADMIN: [
    {
      items: [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
        { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
    {
      title: 'Manage',
      items: [
        { to: '/admin/counters', label: 'Counters', icon: Store },
        { to: '/admin/meals', label: 'Meal Sessions', icon: Clock3 },
        { to: '/admin/menu', label: 'Menu', icon: ClipboardList },
        { to: '/admin/staff', label: 'Staff', icon: UserCog },
        { to: '/admin/students', label: 'Students', icon: Users },
      ],
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  STAFF: 'Mess Staff',
  ADMIN: 'Administrator',
};
