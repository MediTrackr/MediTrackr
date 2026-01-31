import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Mail, Building2, Stethoscope } from "lucide-react";

export default function Profile() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary text-glow">Profile Settings</h1>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input id="fullname" label="Full Name" placeholder="Dr. John Doe" />
            <Input id="email" label="Email" type="email" placeholder="doctor@example.com" />
            <Input id="practice" label="Practice Name" placeholder="Main Street Medical Clinic" />
            <Input id="specialty" label="Specialty" placeholder="Family Medicine" />
            <Button glow className="mt-4">Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
