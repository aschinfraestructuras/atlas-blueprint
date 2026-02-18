import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut } from "lucide-react";

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-widest text-foreground uppercase">
            ATLAS
          </h1>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            Authentication OK – Secure session established
          </p>
        </div>

        {/* Session info */}
        <div className="rounded-lg border bg-card p-4 text-left space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Active session
          </p>
          <p className="text-sm text-card-foreground font-mono break-all">
            {user?.email}
          </p>
        </div>

        {/* Sign out */}
        <Button
          variant="outline"
          className="w-full"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
