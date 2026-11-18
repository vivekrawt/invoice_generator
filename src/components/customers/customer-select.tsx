"use client";

import * as React from "react";
import { Search, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, jsonBody } from "@/lib/api-client";
import type { Customer } from "@/types/database.types";

interface CustomerSelectProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onAddNewCustomer?: (customer: Customer) => void;
}

/**
 * Reusable Customer Selector Component for Invoice Creation (Part 2 Ready)
 * Supports searching saved customers, populating billing details, and quick inline creation.
 */
export function CustomerSelect({
  selectedCustomer,
  onSelectCustomer,
  onAddNewCustomer,
}: CustomerSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Quick Add Modal inside picker
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [newCity, setNewCity] = React.useState("Gurugram");
  const [newState, setNewState] = React.useState("Haryana");
  const [newPincode, setNewPincode] = React.useState("122001");
  const [newGstin, setNewGstin] = React.useState("");
  const [savingNew, setSavingNew] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setCustomers(await apiRequest<Customer[]>("/api/data/customers"));
    } catch (err) {
      setErrorMessage(err instanceof Error ? `Customers could not be loaded: ${err.message}` : "Customers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      fetchCustomers();
    }
  }, [open, fetchCustomers]);

  const filtered = customers.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone || !newAddress) return;

    try {
      setSavingNew(true);
      setErrorMessage(null);
      const payload = {
        customer_name: newName.trim(),
        phone: newPhone.trim(),
        billing_address: newAddress.trim(),
        city: newCity.trim(),
        state: newState.trim(),
        pincode: newPincode.trim(),
        gstin: newGstin.trim() || null,
        contact_person: null,
        email: null,
      };

      const customer = await apiRequest<Customer>("/api/data/customers", {
        method: "POST",
        body: jsonBody(payload),
      });
      onSelectCustomer(customer);
      if (onAddNewCustomer) onAddNewCustomer(customer);
      setAddModalOpen(false);
      setOpen(false);
    } catch (err) {
      console.error("Error creating customer:", err);
      setErrorMessage(err instanceof Error ? `Customer could not be saved: ${err.message}` : "Customer could not be saved.");
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
          Customer / Billed To *
        </label>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="text-xs text-[#0b1f3a] font-medium hover:underline flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Quick Add New
        </button>
      </div>
      {errorMessage && (
        <p role="alert" className="text-xs text-red-700">{errorMessage}</p>
      )}

      {selectedCustomer ? (
        <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">
                {selectedCustomer.customer_name}
              </span>
              {selectedCustomer.gstin && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                  GSTIN: {selectedCustomer.gstin}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {selectedCustomer.billing_address}, {selectedCustomer.city},{" "}
              {selectedCustomer.state} - {selectedCustomer.pincode}
            </p>
            <p className="text-xs text-slate-600 font-medium">
              Phone: {selectedCustomer.phone}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            className="text-xs h-8"
          >
            Change
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          className="w-full justify-start text-slate-500 font-normal h-10 border-dashed"
        >
          <Search className="h-4 w-4 mr-2 text-slate-400" />
          Click to search & select customer from saved records...
        </Button>
      )}

      {/* Search & Select Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Choose an existing client or register a new one to populate billing information.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by legal name or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
              {loading ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Loading saved customers...
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCustomer(c);
                      setOpen(false);
                    }}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-900">
                        {c.customer_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {c.city}, {c.state} • Phone: {c.phone}
                      </p>
                    </div>
                    {selectedCustomer?.id === c.id && (
                      <Check className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching customers found.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setAddModalOpen(true);
                }}
                className="text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                Add New Customer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Add Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent onClose={() => setAddModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              New customer will be automatically saved to your master customer records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCustomer} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Company / Legal Name *</label>
              <Input
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Haryana Logistics Ltd"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                <Input
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="9876543210"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">GSTIN (Optional)</label>
                <Input
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value)}
                  placeholder="06AAAAA0000A1Z5"
                  className="text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Billing Address *</label>
              <Input
                required
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Plot No 45, Phase 1, Udyog Vihar"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">City *</label>
                <Input
                  required
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">State *</label>
                <Input
                  required
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">PIN Code *</label>
                <Input
                  required
                  value={newPincode}
                  onChange={(e) => setNewPincode(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingNew}
                className="bg-[#0b1f3a] hover:bg-[#132c50]"
              >
                {savingNew ? "Saving..." : "Save & Select"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
