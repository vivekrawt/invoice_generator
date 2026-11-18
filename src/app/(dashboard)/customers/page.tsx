"use client";

import * as React from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { Customer } from "@/types/database.types";

interface CustomerFormData {
  customer_name: string;
  contact_person: string;
  phone: string;
  email: string;
  billing_address: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
}

const initialFormState: CustomerFormData = {
  customer_name: "",
  contact_person: "",
  phone: "",
  email: "",
  billing_address: "",
  city: "Gurugram",
  state: "Haryana",
  pincode: "122001",
  gstin: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [message, setMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dialog states
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);

  // Form states
  const [formData, setFormData] = React.useState<CustomerFormData>(initialFormState);
  const [saving, setSaving] = React.useState(false);

  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      setCustomers(await apiRequest<Customer[]>("/api/data/customers"));
    } catch (err) {
      setMessage({
        text: err instanceof Error ? `Customers could not be loaded: ${err.message}` : "Customers could not be loaded.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openAddDialog = () => {
    setEditingCustomer(null);
    setFormData(initialFormState);
    setDialogOpen(true);
  };

  const openEditDialog = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      customer_name: cust.customer_name,
      contact_person: cust.contact_person || "",
      phone: cust.phone,
      email: cust.email || "",
      billing_address: cust.billing_address,
      city: cust.city,
      state: cust.state,
      pincode: cust.pincode,
      gstin: cust.gstin || "",
    });
    setDialogOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.phone.trim() || !formData.billing_address.trim()) {
      setMessage({
        text: "Please fill in all required fields (Company Name, Phone, and Billing Address).",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        customer_name: formData.customer_name.trim(),
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        billing_address: formData.billing_address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        gstin: formData.gstin.trim() ? formData.gstin.trim().toUpperCase() : null,
      };

      if (editingCustomer) {
        const saved = await apiRequest<Customer>(`/api/data/customers/${editingCustomer.id}`, {
          method: "PUT",
          body: jsonBody(payload),
        });
        setCustomers((prev) => prev.map((customer) => customer.id === saved.id ? saved : customer));
        setMessage({ text: "Customer details updated successfully.", type: "success" });
      } else {
        const saved = await apiRequest<Customer>("/api/data/customers", {
          method: "POST",
          body: jsonBody(payload),
        });
        setCustomers((prev) => [saved, ...prev]);
        setMessage({ text: "New customer registered successfully.", type: "success" });
      }

      setDialogOpen(false);
    } catch (err: unknown) {
      console.error("Error saving customer:", err);
      setMessage({
        text: err instanceof Error ? `Customer could not be saved: ${err.message}` : "Customer could not be saved.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      setSaving(true);
      await apiRequest(`/api/data/customers/${customerToDelete.id}`, { method: "DELETE" });

      setCustomers((prev) => prev.filter((c) => c.id !== customerToDelete.id));
      setMessage({ text: "Customer record removed.", type: "success" });
      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      console.error("Error deleting customer:", err);
      setMessage({
        text: err instanceof Error ? `Customer could not be deleted: ${err.message}` : "Customer could not be deleted.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Filtered by Name or Phone
  const filteredCustomers = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.contact_person && c.contact_person.toLowerCase().includes(q)) ||
        (c.city && c.city.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage corporate accounts and billing profiles. Saved customer info auto-populates during invoice creation.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openAddDialog}
          className="text-xs gap-1.5 bg-[#0b1f3a] hover:bg-[#132c50]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Customer</span>
        </Button>
      </div>

      {/* Notice / Feedback Message */}
      {message && (
        <div
          className={`p-3 rounded-md border text-xs flex items-center justify-between ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xs underline ml-2 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search customers by company legal name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Registered Clients ({filteredCustomers.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Click &quot;Edit&quot; to update tax or address details
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span>Loading customer directory...</span>
            </div>
          ) : filteredCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer / Company</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Phone & Email</TableHead>
                  <TableHead>Billing Address</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((cust) => (
                  <TableRow key={cust.id}>
                    <TableCell className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {cust.customer_name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {cust.contact_person || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <div>{cust.phone}</div>
                      {cust.email && (
                        <div className="text-[11px] text-slate-400 truncate">
                          {cust.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-xs">
                      <div className="truncate">{cust.billing_address}</div>
                      <div className="text-[11px] text-slate-400">
                        {cust.city}, {cust.state} – {cust.pincode}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {cust.gstin ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {cust.gstin}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(cust)}
                          className="h-7 w-7 text-slate-600 hover:text-slate-900"
                          title="Edit Customer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCustomerToDelete(cust);
                            setDeleteDialogOpen(true);
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-red-700 hover:bg-red-50"
                          title="Delete Customer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No customers registered</p>
              <p className="text-slate-400 mt-0.5 mb-3">
                Add your first customer now or create one directly during invoice creation.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={openAddDialog}
                className="text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Customer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Customer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent onClose={() => setDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Customer Details" : "Register New Customer"}
            </DialogTitle>
            <DialogDescription>
              Enter accurate billing information. These details will be printed on all invoices issued to this client.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="space-y-3.5">
            <div className="space-y-1">
              <Label htmlFor="customer_name">Customer / Company Legal Name *</Label>
              <Input
                id="customer_name"
                required
                placeholder="e.g. Haryana Logistics Ltd"
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({ ...formData, customer_name: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="contact_person">Contact Person (Optional)</Label>
                <Input
                  id="contact_person"
                  placeholder="e.g. Mr. Rajesh Sharma"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  required
                  placeholder="e.g. 9811223344"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="email">Email Address (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="billing@clientcompany.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gstin">GSTIN (Optional)</Label>
                <Input
                  id="gstin"
                  placeholder="e.g. 06AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) =>
                    setFormData({ ...formData, gstin: e.target.value })
                  }
                  className="text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="billing_address">Billing Address *</Label>
              <Textarea
                id="billing_address"
                required
                rows={2}
                placeholder="Building name, Plot / Flat number, Street / Industrial Area"
                value={formData.billing_address}
                onChange={(e) =>
                  setFormData({ ...formData, billing_address: e.target.value })
                }
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  required
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pincode">PIN Code *</Label>
                <Input
                  id="pincode"
                  required
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-[#0b1f3a] hover:bg-[#132c50]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : editingCustomer ? (
                  "Update Customer"
                ) : (
                  "Save Customer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClose={() => setDeleteDialogOpen(false)}>
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Remove Customer Record
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{customerToDelete?.customer_name}</strong>?
              Past generated invoices referencing this customer will retain their billing records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDelete}
              disabled={saving}
            >
              {saving ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
