import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wrench, 
  Laptop, 
  CalendarClock, 
  Boxes, 
  BookOpen, 
  Users, 
  History, 
  LogOut, 
  User as UserIcon,
  ShieldCheck,
  Building,
  Settings as SettingsIcon,
  Shield
} from 'lucide-react';
import { getDb } from '@/db';
import { users, tickets, settings, roles } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import SidebarUser from '@/components/SidebarUser';
import NavigationBlocker from '@/components/NavigationBlocker';

// // // // // // // // // // export const runtime = 'edge'; /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */ /* local-dev-node */

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const userId = headerList.get('x-user-id');
  const userName = decodeURIComponent(headerList.get('x-user-name') || 'User');
  const userRole = headerList.get('x-user-role') || 'USER';

  if (!userId) {
    redirect('/login');
  }

  // Query user profile details from database
  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, Number(userId)),
  });

  // Query company settings for branding
  let companyName = 'IT WORKPLACE';
  let companyLogo = '';
  try {
    const allSettings = await db.select().from(settings);
    const settingsObject: Record<string, string> = {};
    allSettings.forEach((s: { key: string; value: string | null }) => {
      settingsObject[s.key] = s.value || '';
    });
    if (settingsObject.companyName) companyName = settingsObject.companyName;
    if (settingsObject.companyLogo) companyLogo = settingsObject.companyLogo;
  } catch (err) {
    console.error('Failed to query company settings:', err);
  }

  // Query active tickets count for badge
  let activeTicketsCount = 0;
  let activePMJobsCount = 0;
  try {
    let rawActiveTickets: any[] = [];
    if (userRole === 'ADMIN' || userRole === 'TECH') {
      rawActiveTickets = await db.query.tickets.findMany({
        where: or(
          eq(tickets.status, 'Open'),
          eq(tickets.status, 'In_Progress'),
          eq(tickets.status, 'Pending')
        )
      });
    } else if (userRole === 'APPROVER') {
      // Approvers see count of tickets awaiting their approval
      const pendingApprovalTickets = await db.query.tickets.findMany({
        where: eq(tickets.status, 'Pending_Approval')
      });
      // Also count their own active tickets
      const ownActiveTickets = await db.query.tickets.findMany({
        where: and(
          eq(tickets.reporterId, Number(userId)),
          or(
            eq(tickets.status, 'Open'),
            eq(tickets.status, 'In_Progress'),
            eq(tickets.status, 'Pending')
          )
        )
      });
      rawActiveTickets = [...pendingApprovalTickets, ...ownActiveTickets];
    } else {
      rawActiveTickets = await db.query.tickets.findMany({
        where: and(
          eq(tickets.reporterId, Number(userId)),
          or(
            eq(tickets.status, 'Open'),
            eq(tickets.status, 'In_Progress'),
            eq(tickets.status, 'Pending')
          )
        )
      });
    }

    // Split between regular tickets and PM tickets
    const regularActive = rawActiveTickets.filter(t => !t.ticketNo.startsWith('TCK-PM-'));
    const pmActive = rawActiveTickets.filter(t => t.ticketNo.startsWith('TCK-PM-'));

    activeTicketsCount = regularActive.length;
    activePMJobsCount = pmActive.length;
  } catch (err) {
    console.error('Failed to query ticket badge count:', err);
  }

  // Query dynamic allowed menus for this role
  let allowedHrefs: string[] = [];
  try {
    const dbRole = await db.query.roles.findFirst({
      where: eq(roles.name, userRole),
    });

    if (dbRole) {
      allowedHrefs = JSON.parse(dbRole.menusJson);
    } else {
      // Hardcoded fallback logic for standard default roles
      if (userRole === 'ADMIN') {
        allowedHrefs = [
          '/dashboard', '/dashboard/tickets', '/dashboard/assets', '/dashboard/pm', 
          '/dashboard/inventory', '/dashboard/kb', '/dashboard/users', '/dashboard/departments', 
          '/dashboard/roles', '/dashboard/settings', '/dashboard/audit'
        ];
      } else if (userRole === 'TECH') {
        allowedHrefs = ['/dashboard', '/dashboard/tickets', '/dashboard/assets', '/dashboard/pm', '/dashboard/inventory', '/dashboard/kb', '/dashboard/audit'];
      } else if (userRole === 'APPROVER') {
        allowedHrefs = ['/dashboard', '/dashboard/tickets', '/dashboard/assets', '/dashboard/pm', '/dashboard/kb', '/dashboard/audit'];
      } else {
        allowedHrefs = ['/dashboard', '/dashboard/tickets', '/dashboard/kb'];
      }
    }
  } catch (e) {
    console.error('Failed to resolve dynamic allowed menus:', e);
    allowedHrefs = ['/dashboard', '/dashboard/tickets'];
  }

  // Navigation Items with Roles
  const navItems = [
    { name: 'แดชบอร์ด', href: '/dashboard', icon: LayoutDashboard },
    { name: 'งานแจ้งซ่อม (Tickets)', href: '/dashboard/tickets', icon: Wrench },
    { name: 'ทรัพย์สินไอที (Assets)', href: '/dashboard/assets', icon: Laptop },
    { name: 'แผนบำรุงรักษา (PM Plans)', href: '/dashboard/pm', icon: CalendarClock },
    { name: 'งานบำรุงรักษา (PM Jobs)', href: '/dashboard/pm/jobs', icon: CalendarClock },
    { name: 'คลังอะไหล่ (Inventory)', href: '/dashboard/inventory', icon: Boxes },
    { name: 'คลังความรู้ (KB)', href: '/dashboard/kb', icon: BookOpen },
    { name: 'จัดการผู้ใช้ (Users)', href: '/dashboard/users', icon: Users },
    { name: 'จัดการแผนก (Departments)', href: '/dashboard/departments', icon: Building },
    { name: 'จัดการสิทธิ์ (Roles)', href: '/dashboard/roles', icon: Shield },
    { name: 'ตั้งค่าระบบ (Settings)', href: '/dashboard/settings', icon: SettingsIcon },
    { name: 'ประวัติระบบ (Audit Logs)', href: '/dashboard/audit', icon: History },
  ];

  // Filter based on database permissions mapping
  const filteredNavItems = navItems.filter(item => 
    allowedHrefs.includes(item.href) || 
    (item.href === '/dashboard/pm/jobs' && allowedHrefs.includes('/dashboard/pm')) ||
    userRole === 'ADMIN'
  );

  return (
    <div className="min-h-screen flex bg-[#030712] text-slate-100 font-sans">
      <NavigationBlocker />
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-[#090d16]/90 border-r border-white/5 backdrop-blur-md flex flex-col justify-between">
        <div>
          {/* Logo Section */}
          <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5 bg-slate-950/20">
            {companyLogo ? (
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center p-0.5 shrink-0">
                <img src={companyLogo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-xs tracking-wider text-white truncate max-w-[140px]">
                {companyName.toUpperCase()}
              </h1>
              <p className="text-[9px] text-indigo-400 font-semibold tracking-widest uppercase">Console</p>
            </div>
          </div>

          {/* User Section */}
          <SidebarUser 
            userId={userId}
            userName={userName}
            userRole={userRole}
            initialProfilePicture={dbUser?.profilePicture || null}
          />

          {/* Navigation Links */}
          <nav className="px-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isTickets = item.href === '/dashboard/tickets';
              const isPMJobs = item.href === '/dashboard/pm/jobs';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    <span>{item.name}</span>
                  </div>
                  {isTickets && activeTicketsCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white animate-pulse">
                      {activeTicketsCount}
                    </span>
                  )}
                  {isPMJobs && activePMJobsCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-extrabold text-slate-950 animate-pulse">
                      {activePMJobsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout Section */}
        <div className="p-4 border-t border-white/5">
          <form action="/api/auth/logout" method="POST" className="w-full">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/5 border border-transparent hover:border-rose-500/10 transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-[#030712]/50 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-8">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              System Online
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-xs text-right hidden sm:block">
              <p className="text-slate-400">เข้าใช้งานในสิทธิ์</p>
              <p className="font-semibold text-white">{userRole}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center text-slate-300">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
