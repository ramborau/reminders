"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Trigger {
  offset: number;
  direction: "BEFORE" | "AFTER" | null;
  time: string;
}

export default function NewComponentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [occurrenceType, setOccurrenceType] = useState<"MONTHLY" | "YEARLY" | "">("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [triggers, setTriggers] = useState<Trigger[]>([
    { offset: 0, direction: null, time: "10:00 AM" },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const maxOffset = occurrenceType === "MONTHLY" ? 7 : 15;

  const handleAddTrigger = () => {
    setTriggers([...triggers, { offset: 0, direction: null, time: "10:00 AM" }]);
  };

  const handleRemoveTrigger = (index: number) => {
    if (triggers.length === 1) {
      toast.error("You must have at least one trigger");
      return;
    }
    setTriggers(triggers.filter((_, i) => i !== index));
  };

  const handleTriggerChange = (index: number, field: keyof Trigger, value: any) => {
    const newTriggers = [...triggers];
    newTriggers[index] = { ...newTriggers[index], [field]: value };

    // Auto-set direction to null when offset is 0
    if (field === "offset" && value === 0) {
      newTriggers[index].direction = null;
    }

    setTriggers(newTriggers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!occurrenceType) {
      toast.error("Please select an occurrence type");
      return;
    }

    // Validate triggers
    for (let i = 0; i < triggers.length; i++) {
      const trigger = triggers[i];
      if (trigger.offset < 0 || trigger.offset > maxOffset) {
        toast.error(`Trigger ${i + 1}: Offset must be between 0 and ${maxOffset}`);
        return;
      }
      if (trigger.offset > 0 && !trigger.direction) {
        toast.error(`Trigger ${i + 1}: Direction is required when offset is greater than 0`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/components", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          occurrenceType,
          webhookUrl,
          triggers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create component");
      }

      toast.success("Component created successfully!");
      router.push(`/dashboard/components/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create component");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Component</h1>
          <p className="text-muted-foreground">
            Create a new reminder component with triggers
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Component Details</CardTitle>
            <CardDescription>
              Basic information about your reminder component
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Component Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Home Loan EMI Reminders"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occurrenceType">Occurrence Type *</Label>
              <Select
                value={occurrenceType}
                onValueChange={(value: "MONTHLY" | "YEARLY") => setOccurrenceType(value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select occurrence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="YEARLY">Yearly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Monthly: For recurring events like EMI payments. Yearly: For annual events like birthdays.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL *</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://your-webhook-url.com/endpoint"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                The URL where webhook notifications will be sent
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Triggers</CardTitle>
            <CardDescription>
              Define when webhooks should be fired for this component
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {triggers.map((trigger, index) => (
              <div key={index} className="flex gap-4 rounded-lg border p-4">
                <div className="flex-1 space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Offset (days)</Label>
                      <Input
                        type="number"
                        min="0"
                        max={maxOffset}
                        value={trigger.offset}
                        onChange={(e) =>
                          handleTriggerChange(index, "offset", parseInt(e.target.value) || 0)
                        }
                        disabled={!occurrenceType}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Direction</Label>
                      <Select
                        value={trigger.direction || ""}
                        onValueChange={(value) =>
                          handleTriggerChange(index, "direction", value || null)
                        }
                        disabled={trigger.offset === 0 || !occurrenceType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={trigger.offset === 0 ? "Exact date" : "Select"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BEFORE">Before</SelectItem>
                          <SelectItem value="AFTER">After</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Time (IST)</Label>
                      <Input
                        type="time"
                        value={trigger.time.split(" ")[0]}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value.split(":");
                          const hour = parseInt(hours);
                          const ampm = hour >= 12 ? "PM" : "AM";
                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          handleTriggerChange(index, "time", `${displayHour.toString().padStart(2, "0")}:${minutes} ${ampm}`);
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {trigger.offset === 0
                      ? `Fire on exact date at ${trigger.time}`
                      : `Fire ${trigger.offset} day${trigger.offset > 1 ? "s" : ""} ${trigger.direction?.toLowerCase() || ""} the date at ${trigger.time}`}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleRemoveTrigger(index)}
                  disabled={triggers.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={handleAddTrigger} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Trigger
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-4">
          <Link href="/dashboard">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Component"}
          </Button>
        </div>
      </form>
    </div>
  );
}
