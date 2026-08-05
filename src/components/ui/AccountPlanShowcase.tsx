import { ArrowLeft, ChevronRight, CreditCard, Home, Mail, Monitor, Shield, User } from 'lucide-react';

// Standalone mock of an account/membership settings layout, built from a
// screenshot for reference. Not wired into any route or nav — QuadEncode
// has no paid tier yet (see CLAUDE.md "Later, do not build now"). All data
// below is placeholder, never real account/payment info.

const NAV_ITEMS = [
  { label: 'Overview', icon: Home },
  { label: 'Membership', icon: CreditCard },
  { label: 'Security', icon: Shield },
  { label: 'Devices', icon: Monitor },
  { label: 'Profiles', icon: User },
];

const QUICK_LINKS = [
  { icon: CreditCard, label: 'Change plan', description: null },
  { icon: CreditCard, label: 'Manage payment method', description: null },
  { icon: Mail, label: 'Buy an extra member slot', description: 'Share your plan with someone who doesn\'t live with you.', badge: 'New' },
];

interface AccountPlanShowcaseProps {
  planName?: string;
  memberSince?: string;
  nextPaymentDate?: string;
  cardLast4?: string;
  activeNavItem?: string;
}

export default function AccountPlanShowcase({
  planName = 'Standard plan',
  memberSince = 'Member since —',
  nextPaymentDate = 'Next payment: —',
  cardLast4 = '0000',
  activeNavItem = 'Overview',
}: AccountPlanShowcaseProps) {
  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      <div className="w-full p-4 sm:p-6 md:p-12 max-w-5xl mx-auto">
        <button
          type="button"
          className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors mb-8 min-h-[44px] -ml-2 px-2 rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid md:grid-cols-[220px_1fr] gap-8">
          <nav className="space-y-1">
            {NAV_ITEMS.map(({ label, icon: Icon }) => {
              const active = label === activeNavItem;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium transition-colors ${
                    active ? 'bg-accent/10 text-accent' : 'text-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </div>
              );
            })}
          </nav>

          <div>
            <h1 className="font-serif text-3xl font-bold mb-6">Account</h1>

            <section className="mb-10">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted mb-3">Membership details</h2>
              <div className="bg-[#1a1712] border border-border rounded-2xl overflow-hidden">
                <div className="p-6 space-y-3">
                  <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-accent-muted text-accent">
                    {memberSince}
                  </span>
                  <p className="font-serif text-xl font-semibold">{planName}</p>
                  <p className="text-sm text-muted">{nextPaymentDate}</p>
                  <p className="text-sm font-mono text-muted">•••• •••• •••• {cardLast4}</p>
                </div>
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-4 min-h-[44px] border-t border-border text-sm font-medium hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Manage membership
                  <ChevronRight className="w-4 h-4 text-muted" />
                </button>
              </div>
            </section>

            <section>
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted mb-3">Quick links</h2>
              <div className="bg-[#1a1712] border border-border rounded-2xl divide-y divide-border">
                {QUICK_LINKS.map(({ icon: Icon, label, description, badge }) => (
                  <button
                    key={label}
                    type="button"
                    className="w-full flex items-center gap-4 px-6 py-4 min-h-[44px] text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-muted shrink-0" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      {description && <span className="block text-xs text-muted mt-0.5">{description}</span>}
                    </span>
                    {badge && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent">{badge}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
