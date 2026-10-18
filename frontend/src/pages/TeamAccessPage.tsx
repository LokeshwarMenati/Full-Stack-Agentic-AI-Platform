import {
  Users,
  UserPlus,
} from 'lucide-react';

export const TeamAccessPage: React.FC = () => {
  const teamMembers = [
    {
      id: 1,
      name: 'Alex Chen',
      email: 'alex.chen@example.com',
      role: 'Employee / User',
      status: 'Active',
      permissions: ['Ask Policies', 'Book Appointments', 'Voice Studio'],
      avatar: 'AC',
    },
    {
      id: 2,
      name: 'Sarah Connor',
      email: 'sarah.connor@example.com',
      role: 'HR Operations Lead',
      status: 'Active',
      permissions: ['Manage Bookings', 'Edit Calendar Slots', 'Access Evidence'],
      avatar: 'SC',
    },
    {
      id: 3,
      name: 'Marcus Vance',
      email: 'marcus.v@example.com',
      role: 'AI Systems Architect',
      status: 'Active',
      permissions: ['Full StateGraph Access', 'Prompt Engineering', 'API Configuration'],
      avatar: 'MV',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#030817] text-[#F4F7FF]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#176BFF]/20 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F4F7FF] flex items-center gap-2">
            <Users className="h-6 w-6 text-[#00E5FF]" />
            <span>Team & Access Control</span>
          </h1>
          <p className="text-xs text-[#94A9C8] mt-1">
            Enterprise role-based access management, session keys, and authenticated organizational personnel.
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#176BFF] hover:bg-[#176BFF]/80 text-white text-xs font-semibold shadow-lg shadow-[#176BFF]/25 transition-all">
          <UserPlus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Team Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {teamMembers.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl bg-[#071329] border border-[#176BFF]/25 p-4.5 shadow-lg backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#176BFF] to-[#00E5FF] flex items-center justify-center font-bold text-xs text-white shadow-md">
                  {m.avatar}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F4F7FF]">{m.name}</h3>
                  <p className="text-xs text-[#5A7199] font-mono">{m.email}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A7199]">Role:</span>
                  <span className="font-semibold text-[#00E5FF]">{m.role}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5A7199]">Session:</span>
                  <span className="flex items-center gap-1 text-[#00E6A0]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00E6A0] animate-pulse" />
                    {m.status}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#176BFF]/15">
                <p className="text-[10px] font-mono text-[#5A7199] mb-1.5 uppercase">Granted Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {m.permissions.map((p, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#0A1830] text-[#94A9C8] border border-[#176BFF]/20"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
