import {
  Activity,
  FileText,
  Globe,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Superadmin',
    email: 'admin@visualmonitor.az',
    avatar: '/avatars/shadcn.jpg',
  },

  teams: [
    {
      name: 'Visual Monitor',
      logo: ShieldCheck,
      plan: 'Superadmin',
    },
  ],

  navGroups: [
    {
      title: 'Əsas idarəetmə',
      items: [
        {
          title: 'Ana panel',
          url: '/admin',
          icon: LayoutDashboard,
        },
        {
          title: 'Müştərilər',
          url: '/admin/users',
          icon: Users,
        },
        {
          title: 'Mənbələr',
          url: '/admin/monitor/sources',
          icon: Globe,
        },
        {
          title: 'Dəyişiklik monitoru',
          url: '/admin/change-monitor',
          icon: Activity,
        },
        {
          title: 'Bot logları',
          url: '/admin/monitor/logs',
          icon: FileText,
        },
      ],
    },
  ],
}
