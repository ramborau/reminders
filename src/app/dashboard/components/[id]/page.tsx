"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Plus, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Component {
  id: string;
  name: string;
  occurrenceType: "MONTHLY" | "YEARLY";
  webhookUrl: string;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
  triggers: Array<{
    id: string;
    offset: number;
    direction: "BEFORE" | "AFTER" | null;
    time: string;
    status: "ACTIVE" | "PAUSED";
  }>;
  _count: {
    records: number;
  };
}

export default function ComponentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const componentId = params.id as string;

  const [component, setComponent] = useState<Component | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!component) return;

    try {
      const newStatus = component.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const response = await fetch(`/api/components/${componentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setComponent({ ...component, status: newStatus });
        toast.success(`Component ${newStatus === "ACTIVE" ? "activated" : "paused"}`);
      } else {
        toast.error("Failed to update component");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/components/${componentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Component deleted successfully");
        router.push("/dashboard");
      } else {
        toast.error("Failed to delete component");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading component...</p>
      </div>
    );
  }

  if (!component) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{component.name}</h1>
              <Badge variant={component.status === "ACTIVE" ? "default" : "secondary"}>
                {component.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">{component.occurrenceType} Component</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleToggleStatus}>
            {component.status === "ACTIVE" ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Webhook URL</p>
              <p className="text-sm break-all">{component.webhookUrl}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Records</p>
              <p className="text-sm">{component._count.records} total records</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-sm">
                {new Date(component.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Triggers</CardTitle>
            <CardDescription>{component.triggers.length} active triggers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {component.triggers.map((trigger) => (
                <div
                  key={trigger.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {trigger.offset === 0
                        ? "Exact date"
                        : `${trigger.offset} day${trigger.offset > 1 ? "s" : ""} ${trigger.direction?.toLowerCase()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">at {trigger.time} IST</p>
                  </div>
                  <Badge variant={trigger.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                    {trigger.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Records</CardTitle>
              <CardDescription>
                {component._count.records} record{component._count.records !== 1 ? "s" : ""} in this component
              </CardDescription>
            </div>
            <Link href={`/dashboard/components/${componentId}/records/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Record
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Record management coming soon...
          </p>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this component? This will delete all {component._count.records} records and triggers. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
