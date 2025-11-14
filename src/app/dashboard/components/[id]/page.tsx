"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Edit, Trash2, Plus, Play, Pause, Search, Upload, Download } from "lucide-react";
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

  // Bulk import state
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    totalRows: number;
    successfulImports: number;
    failedImports: number;
    errors: Array<{ row: number; data: any; error: string }>;
  } | null>(null);

  // Edit record state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    mobile: "",
    emi: "",
    date: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Trigger management state
  const [showEditTriggerDialog, setShowEditTriggerDialog] = useState(false);
  const [showDeleteTriggerDialog, setShowDeleteTriggerDialog] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Component["triggers"][0] | null>(null);
  const [triggerFormData, setTriggerFormData] = useState({
    offset: "",
    direction: "",
    time: "",
    status: "ACTIVE" as "ACTIVE" | "PAUSED",
  });
  const [isUpdatingTrigger, setIsUpdatingTrigger] = useState(false);
  const [isDeletingTrigger, setIsDeletingTrigger] = useState(false);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleBulkImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`/api/components/${componentId}/records/bulk-import`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok || response.status === 207) {
        setImportResult(result);
        if (result.success) {
          toast.success(`Successfully imported ${result.successfulImports} records`);
          fetchRecords();
          fetchComponent();
          setSelectedFile(null);
        } else {
          toast.warning(
            `Imported ${result.successfulImports} records, ${result.failedImports} failed`
          );
        }
      } else {
        toast.error(result.error || "Failed to import records");
      }
    } catch (error) {
      toast.error("An error occurred during import");
      console.error("Import error:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!component) return;

    const template =
      component.occurrenceType === "MONTHLY"
        ? "name,mobile,emi,date\nJohn Doe,919876543210,5000,15\nJane Smith,919876543211,7500,10"
        : "name,mobile,amount,date\nJohn Doe,919876543210,5000,15/08/1990\nJane Smith,919876543211,7500,25/12/1995";

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${component.name.replace(/\s+/g, "_")}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Template downloaded");
  };

  const handleCloseBulkImportDialog = () => {
    setShowBulkImportDialog(false);
    setSelectedFile(null);
    setImportResult(null);
  };

  const handleEditRecord = (record: Record) => {
    setEditingRecord(record);
    setEditFormData({
      name: record.name,
      mobile: record.mobile,
      emi: record.emi.toString(),
      date: record.date,
    });
    setShowEditDialog(true);
  };

  const handleUpdateRecord = async () => {
    if (!editingRecord) return;

    setIsUpdating(true);

    try {
      const response = await fetch(
        `/api/components/${componentId}/records/${editingRecord.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editFormData.name,
            mobile: editFormData.mobile,
            emi: parseFloat(editFormData.emi),
            date: editFormData.date,
          }),
        }
      );

      if (response.ok) {
        toast.success("Record updated successfully");
        setShowEditDialog(false);
        setEditingRecord(null);
        fetchRecords();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update record");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error("Update error:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseEditDialog = () => {
    setShowEditDialog(false);
    setEditingRecord(null);
  };

  const handleEditTrigger = (trigger: Component["triggers"][0]) => {
    setEditingTrigger(trigger);
    setTriggerFormData({
      offset: trigger.offset.toString(),
      direction: trigger.direction || "",
      time: trigger.time,
      status: trigger.status,
    });
    setShowEditTriggerDialog(true);
  };

  const handleUpdateTrigger = async () => {
    if (!editingTrigger) return;

    setIsUpdatingTrigger(true);

    try {
      const offset = parseInt(triggerFormData.offset);
      const response = await fetch(
        `/api/components/${componentId}/triggers/${editingTrigger.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            offset,
            direction: offset === 0 ? null : (triggerFormData.direction || null),
            time: triggerFormData.time,
            status: triggerFormData.status,
          }),
        }
      );

      if (response.ok) {
        toast.success("Trigger updated successfully");
        setShowEditTriggerDialog(false);
        setEditingTrigger(null);
        fetchComponent();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update trigger");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error("Update error:", error);
    } finally {
      setIsUpdatingTrigger(false);
    }
  };

  const handleDeleteTrigger = async () => {
    if (!editingTrigger) return;

    setIsDeletingTrigger(true);

    try {
      const response = await fetch(
        `/api/components/${componentId}/triggers/${editingTrigger.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        toast.success("Trigger deleted successfully");
        setShowDeleteTriggerDialog(false);
        setEditingTrigger(null);
        fetchComponent();
      } else {
        toast.error("Failed to delete trigger");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsDeletingTrigger(false);
    }
  };

  const handleCloseEditTriggerDialog = () => {
    setShowEditTriggerDialog(false);
    setEditingTrigger(null);
  };

  const handleOpenDeleteTriggerDialog = (trigger: Component["triggers"][0]) => {
    setEditingTrigger(trigger);
    setShowDeleteTriggerDialog(true);
  };

  const handleCloseDeleteTriggerDialog = () => {
    setShowDeleteTriggerDialog(false);
    setEditingTrigger(null);
  };

  const handleExportRecords = (format: "csv" | "xlsx") => {
    const url = `/api/components/${componentId}/records/export?format=${format}`;
    window.open(url, "_blank");
    toast.success(`Exporting records as ${format.toUpperCase()}`);
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
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {trigger.offset === 0
                        ? "Exact date"
                        : `${trigger.offset} day${trigger.offset > 1 ? "s" : ""} ${trigger.direction?.toLowerCase()}`}
                    </p>
                    <p className="text-xs text-muted-foreground">at {trigger.time} IST</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={trigger.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                      {trigger.status}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditTrigger(trigger)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDeleteTriggerDialog(trigger)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
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
              {records.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportRecords("csv")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportRecords("xlsx")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkImportDialog(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Bulk Import
              </Button>
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      <Dialog open={showBulkImportDialog} onOpenChange={handleCloseBulkImportDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Records</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel file to import multiple records at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
              >
                Choose File
              </label>
              {selectedFile && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">File Format Requirements:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>CSV or Excel file (.csv, .xlsx, .xls)</li>
                <li>Required columns: name, mobile, {component?.occurrenceType === "MONTHLY" ? "emi" : "amount"}, date</li>
                <li>Mobile: Must be 12 digits starting with 91</li>
                <li>
                  Date: {component?.occurrenceType === "MONTHLY"
                    ? "Number between 1-28"
                    : "Format DD/MM/YYYY"}
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>

            {importResult && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Import Results</h4>
                  <Badge variant={importResult.success ? "default" : "secondary"}>
                    {importResult.success ? "Success" : "Partial Success"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total Rows</p>
                    <p className="font-medium">{importResult.totalRows}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Successful</p>
                    <p className="font-medium text-green-600">{importResult.successfulImports}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Failed</p>
                    <p className="font-medium text-red-600">{importResult.failedImports}</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-destructive">Errors:</h5>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <div key={index} className="text-xs p-2 bg-muted rounded">
                          <p className="font-medium">Row {error.row}: {error.error}</p>
                          <p className="text-muted-foreground mt-1">
                            {JSON.stringify(error.data)}
                          </p>
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          ... and {importResult.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseBulkImportDialog}>
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button onClick={handleBulkImport} disabled={!selectedFile || isImporting}>
                {isImporting ? "Importing..." : "Import"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={handleCloseEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Update the record details below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                placeholder="Enter name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile</Label>
              <Input
                id="edit-mobile"
                value={editFormData.mobile}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, mobile: e.target.value })
                }
                placeholder="91XXXXXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-emi">
                {component?.occurrenceType === "MONTHLY" ? "EMI" : "Amount"}
              </Label>
              <Input
                id="edit-emi"
                type="number"
                value={editFormData.emi}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, emi: e.target.value })
                }
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                value={editFormData.date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, date: e.target.value })
                }
                placeholder={
                  component?.occurrenceType === "MONTHLY"
                    ? "1-28"
                    : "DD/MM/YYYY"
                }
              />
              <p className="text-xs text-muted-foreground">
                {component?.occurrenceType === "MONTHLY"
                  ? "Enter a number between 1 and 28"
                  : "Enter date in DD/MM/YYYY format"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecord} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditTriggerDialog} onOpenChange={handleCloseEditTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trigger</DialogTitle>
            <DialogDescription>
              Update the trigger settings below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trigger-offset">Offset (days)</Label>
              <Input
                id="trigger-offset"
                type="number"
                min="0"
                max={component?.occurrenceType === "MONTHLY" ? 7 : 15}
                value={triggerFormData.offset}
                onChange={(e) =>
                  setTriggerFormData({ ...triggerFormData, offset: e.target.value })
                }
                placeholder="Enter offset"
              />
              <p className="text-xs text-muted-foreground">
                {component?.occurrenceType === "MONTHLY"
                  ? "0-7 days for monthly"
                  : "0-15 days for yearly"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-direction">Direction</Label>
              <Select
                value={triggerFormData.direction}
                onValueChange={(value) =>
                  setTriggerFormData({ ...triggerFormData, direction: value })
                }
                disabled={parseInt(triggerFormData.offset) === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select direction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEFORE">Before</SelectItem>
                  <SelectItem value="AFTER">After</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Direction is disabled when offset is 0
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-time">Time (IST)</Label>
              <Input
                id="trigger-time"
                value={triggerFormData.time}
                onChange={(e) =>
                  setTriggerFormData({ ...triggerFormData, time: e.target.value })
                }
                placeholder="10:00 AM"
              />
              <p className="text-xs text-muted-foreground">
                Format: HH:MM AM/PM (e.g., 10:00 AM)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trigger-status">Status</Label>
              <Select
                value={triggerFormData.status}
                onValueChange={(value: "ACTIVE" | "PAUSED") =>
                  setTriggerFormData({ ...triggerFormData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditTriggerDialog}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTrigger} disabled={isUpdatingTrigger}>
              {isUpdatingTrigger ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteTriggerDialog} onOpenChange={handleCloseDeleteTriggerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Trigger</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trigger? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDeleteTriggerDialog}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTrigger}
              disabled={isDeletingTrigger}
            >
              {isDeletingTrigger ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
