"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Edit, Trash2, Plus, Play, Pause, Search } from "lucide-react";
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

interface Record {
  id: string;
  name: string;
  mobile: string;
  emi: number;
  date: string;
  createdAt: string;
}

export default function ComponentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const componentId = params.id as string;

  const [component, setComponent] = useState<Component | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Records state
  const [records, setRecords] = useState<Record[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showDeleteRecordsDialog, setShowDeleteRecordsDialog] = useState(false);

  useEffect(() => {
    fetchComponent();
    fetchRecords();
  }, [componentId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRecords();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

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

  const fetchRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/components/${componentId}/records?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
      }
    } catch (error) {
      console.error("Failed to fetch records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const response = await fetch(`/api/components/${componentId}/records/${recordId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Record deleted successfully");
        fetchRecords();
        if (component) {
          setComponent({
            ...component,
            _count: {
              ...component._count,
              records: component._count.records - 1,
            },
          });
        }
      } else {
        toast.error("Failed to delete record");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteSelectedRecords = async () => {
    try {
      await Promise.all(
        selectedRecords.map((recordId) =>
          fetch(`/api/components/${componentId}/records/${recordId}`, {
            method: "DELETE",
          })
        )
      );

      toast.success(`${selectedRecords.length} record(s) deleted successfully`);
      setSelectedRecords([]);
      fetchRecords();
      if (component) {
        setComponent({
          ...component,
          _count: {
            ...component._count,
            records: component._count.records - selectedRecords.length,
          },
        });
      }
    } catch (error) {
      toast.error("Failed to delete records");
    } finally {
      setShowDeleteRecordsDialog(false);
    }
  };

  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map((r) => r.id));
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
            <div className="flex gap-2">
              {selectedRecords.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteRecordsDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedRecords.length})
                </Button>
              )}
              <Link href={`/dashboard/components/${componentId}/records/new`}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Record
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {isLoadingRecords ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Loading records...
            </p>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery ? "No records found" : "No records yet. Add your first record to get started."}
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedRecords.length === records.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>{component.occurrenceType === "MONTHLY" ? "EMI" : "Amount"}</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRecords.includes(record.id)}
                          onCheckedChange={() => toggleRecordSelection(record.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{record.name}</TableCell>
                      <TableCell>{record.mobile}</TableCell>
                      <TableCell>₹{record.emi.toLocaleString()}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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

      <Dialog open={showDeleteRecordsDialog} onOpenChange={setShowDeleteRecordsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Records</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedRecords.length} selected record(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteRecordsDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelectedRecords}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
