"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Component {
  id: string;
  name: string;
  occurrenceType: "MONTHLY" | "YEARLY";
}

export default function NewRecordPage() {
  const router = useRouter();
  const params = useParams();
  const componentId = params.id as string;

  const [component, setComponent] = useState<Component | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("91");
  const [emi, setEmi] = useState("");
  const [date, setDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingComponent, setIsFetchingComponent] = useState(true);

  useEffect(() => {
    fetchComponent();
  }, [componentId]);

  const fetchComponent = async () => {
    try {
      const response = await fetch(`/api/components/${componentId}`);
      if (response.ok) {
        const data = await response.json();
        setComponent(data);
      } else {
        toast.error("Failed to fetch component");
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("An error occurred");
      router.push("/dashboard");
    } finally {
      setIsFetchingComponent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate mobile number
    if (!/^91\d{10}$/.test(mobile)) {
      toast.error("Mobile number must start with 91 and be exactly 12 digits");
      return;
    }

    // Validate date based on component type
    if (component?.occurrenceType === "MONTHLY") {
      const dateNum = parseInt(date);
      if (isNaN(dateNum) || dateNum < 1 || dateNum > 28) {
        toast.error("For monthly components, date must be between 1 and 28");
        return;
      }
    } else {
      // Validate DD/MM/YYYY format
      if (!/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/.test(date)) {
        toast.error("For yearly components, date must be in DD/MM/YYYY format");
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/components/${componentId}/records`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          mobile,
          emi: parseFloat(emi) || 0,
          date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create record");
      }

      toast.success("Record created successfully!");
      router.push(`/dashboard/components/${componentId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create record");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingComponent) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!component) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/components/${componentId}`}>
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Record</h1>
          <p className="text-muted-foreground">
            Add a new record to {component.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Record Details</CardTitle>
            <CardDescription>
              {component.occurrenceType === "MONTHLY"
                ? "Enter details for a monthly recurring event (e.g., EMI payment)"
                : "Enter details for a yearly recurring event (e.g., birthday)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number *</Label>
              <Input
                id="mobile"
                placeholder="919876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                required
                pattern="^91\d{10}$"
              />
              <p className="text-xs text-muted-foreground">
                Must start with 91 and be exactly 12 digits
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emi">
                {component.occurrenceType === "MONTHLY" ? "EMI Amount" : "Amount"} *
              </Label>
              <Input
                id="emi"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 25000"
                value={emi}
                onChange={(e) => setEmi(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                {component.occurrenceType === "MONTHLY"
                  ? "Monthly EMI amount"
                  : "Can be 0 for non-financial records"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              {component.occurrenceType === "MONTHLY" ? (
                <>
                  <Input
                    id="date"
                    type="number"
                    min="1"
                    max="28"
                    placeholder="e.g., 15"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Day of month (1-28) when reminder should fire
                  </p>
                </>
              ) : (
                <>
                  <Input
                    id="date"
                    placeholder="DD/MM/YYYY (e.g., 15/08/1990)"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    pattern="^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$"
                  />
                  <p className="text-xs text-muted-foreground">
                    Full date in DD/MM/YYYY format (e.g., 15/08/1990)
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-4">
          <Link href={`/dashboard/components/${componentId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Record"}
          </Button>
        </div>
      </form>
    </div>
  );
}
