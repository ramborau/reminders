"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Calendar, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface Component {
  id: string;
  name: string;
  occurrenceType: "MONTHLY" | "YEARLY";
  webhookUrl: string;
  status: "ACTIVE" | "PAUSED";
  createdAt: string;
  _count: {
    records: number;
    triggers: number;
  };
}

export default function ComponentsPage() {
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComponents();
  }, []);

  const fetchComponents = async () => {
    try {
      const response = await fetch("/api/components");
      if (response.ok) {
        const data = await response.json();
        setComponents(data);
      } else {
        toast.error("Failed to fetch components");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Components</h1>
          <p className="text-muted-foreground">
            Manage your reminder components
          </p>
        </div>
        <Link href="/dashboard/components/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Component
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading components...</p>
        </div>
      ) : components.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No components yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Get started by creating your first component
            </p>
            <Link href="/dashboard/components/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Component
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {components.map((component) => (
            <Link key={component.id} href={`/dashboard/components/${component.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1">{component.name}</CardTitle>
                    <Badge variant={component.status === "ACTIVE" ? "default" : "secondary"}>
                      {component.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{component.webhookUrl}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{component.occurrenceType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{component._count.records} records</span>
                      <span>•</span>
                      <span>{component._count.triggers} triggers</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
