import { Card, CardContent } from "../components/ui/card";

export function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your FairVision preferences and account
        </p>
      </div>

      <Card className="border-0">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Settings panel coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
