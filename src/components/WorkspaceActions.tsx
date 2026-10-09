import { FieldLabel } from './FieldLabel';
import { LoadingIndicator } from './ui';
import { Select } from './Select';
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Upload, Download, ArrowUpRight } from "lucide-react";
import { useWorkspace } from "../data/Workspace";
import { Button, Dialog, Input } from "./ui";
import { useFeedback } from "./Feedback";
import { saveLocalFile, downloadLocalFile } from "../lib/local-files";
import type { Document } from "../domain/types";
export function AddSupplier() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { addSupplier, suppliers } = useWorkspace();
  const notify = useFeedback();
  const navigate = useNavigate();
  const countries = [
    ...new Map(
      suppliers.map((s) => [
        s.countryCode,
        { code: s.countryCode, name: s.country },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") || "").trim();
    const country = countries.find((c) => c.code === fields.get("country"));
    if (!name || !country) {
      setError("Please enter a company name and country.");
      return;
    }
    const id = addSupplier({
      name,
      country: country.name,
      countryCode: country.code,
      contactEmail: String(fields.get("email") || ""),
      category: String(fields.get("category") || "General supplier"),
    });
    setOpen(false);
    notify(
      "Connection created.",
      "Supplier saved in your local workspace. No invitation was sent.",
    );
    navigate(`/app/suppliers/${id}`);
  }
  return (
    <>
      <Button
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Plus size={16} />
        Add supplier
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="The next connection."
      >
        <p>Add a supplier identity to your local network.</p>
        <form className="workspace-form" onSubmit={submit}>
          <FieldLabel>
            Company name
            <Input
              name="name"
              required
              maxLength={160}
              placeholder="Company GmbH"
            />
          </FieldLabel>
          <div className="form-grid">
            <FieldLabel>
              Country
              <Select required name="country" defaultValue="">
                <option value="" disabled>
                  Select country
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FieldLabel>
            <FieldLabel>
              Category
              <Input
                name="category"
                required
                maxLength={100}
                placeholder="Precision components"
              />
            </FieldLabel>
          </div>
          <FieldLabel>
            Contact email <span>(optional)</span>
            <Input
              name="email"
              type="email"
              maxLength={254}
              placeholder="contact@company.com"
            />
          </FieldLabel>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit">
            Create connection <ArrowUpRight size={16} />
          </Button>
        </form>
        <p className="dialog-footnote">
          Saved on this browser. Invitations and email delivery are not
          connected.
        </p>
      </Dialog>
    </>
  );
}
export function UploadDocument({ supplierId }: { supplierId?: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { suppliers, addDocument, currentUser } = useWorkspace();
  const notify = useFeedback();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const file = fields.get("file");
    const id = String(fields.get("supplier"));
    if (!(file instanceof File) || !file.size) {
      setError("Choose a document to save.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a file smaller than 10 MB.");
      return;
    }
    if (!["application/pdf", "image/png", "image/jpeg"].includes(file.type)) {
      setError("Choose a PDF, PNG or JPEG document.");
      return;
    }
    if (!suppliers.some((s) => s.id === id)) {
      setError("Choose a supplier.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const documentId = crypto.randomUUID();
      await saveLocalFile(documentId, file);
      addDocument({
        id: documentId,
        supplierId: id,
        name: file.name,
        kind: fields.get("kind") as Document["kind"],
        mimeType: file.type,
        storagePath: `local:${documentId}`,
        uploadedBy: currentUser.id,
        uploadedAt: new Date().toISOString(),
        verificationStatus: "unverified",
      });
      setOpen(false);
      notify("Document saved.", "Stored on this device and awaiting review.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The document could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Upload size={16} />
        Upload document
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title="Give information a place."
      >
        <p>
          Save a document against its supplier. This local upload stays on your
          device.
        </p>
        <form className="workspace-form" onSubmit={submit}>
          <FieldLabel>
            Supplier
            <Select name="supplier" required defaultValue={supplierId || ""}>
              <option value="" disabled>
                Choose a supplier
              </option>
              {suppliers.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.legalName}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel>
            Document type
            <Select name="kind">
              <option value="certificate">Certificate</option>
              <option value="declaration">Declaration</option>
              <option value="company">Company information</option>
            </Select>
          </FieldLabel>
          <FieldLabel className="file-drop">
            <Upload size={26} />
            <strong>Choose your document</strong>
            <span>PDF, PNG or JPEG · Maximum 10 MB</span>
            <input
              required
              name="file"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
            />
          </FieldLabel>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? <LoadingIndicator compact label="Saving document…" /> : "Save document"}
            <ArrowUpRight size={16} />
          </Button>
        </form>
      </Dialog>
    </>
  );
}
export function DownloadDocument({ document }: { document: Document }) {
  const notify = useFeedback();
  return (
    <Button
      variant="ghost"
      aria-label={`Download ${document.name}`}
      onClick={async () => {
        try {
          await downloadLocalFile(document.id, document.name);
        } catch (error) {
          notify(
            "File unavailable.",
            error instanceof Error
              ? error.message
              : "The file could not be opened.",
          );
        }
      }}
    >
      <Download size={16} />
    </Button>
  );
}
export function EditOrganization() {
  const [open, setOpen] = useState(false);
  const { organization, saveOrganization } = useWorkspace();
  const notify = useFeedback();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    saveOrganization({
      name: String(fields.get("name")).trim(),
      countryCode: String(fields.get("country")).trim().toUpperCase(),
      registrationNumber: String(fields.get("registration")).trim(),
      website: String(fields.get("website")).trim(),
    });
    setOpen(false);
    notify(
      "Company details updated.",
      "Changes saved in this local workspace.",
    );
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit company <ArrowUpRight size={16} />
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Your company identity."
      >
        <form className="workspace-form" onSubmit={submit}>
          <FieldLabel>
            Legal name
            <Input
              name="name"
              defaultValue={organization.legalName}
              required
              maxLength={160}
            />
          </FieldLabel>
          <div className="form-grid">
            <FieldLabel>
              Country code
              <Input
                name="country"
                defaultValue={organization.countryCode}
                required
                pattern="[A-Za-z]{2}"
                maxLength={2}
              />
            </FieldLabel>
            <FieldLabel>
              Registration number
              <Input
                name="registration"
                defaultValue={organization.registrationNumber}
                maxLength={100}
              />
            </FieldLabel>
          </div>
          <FieldLabel>
            Website
            <Input
              name="website"
              defaultValue={organization.website}
              maxLength={254}
            />
          </FieldLabel>
          <Button type="submit">
            Save changes <CheckSmall />
          </Button>
        </form>
      </Dialog>
    </>
  );
}
function CheckSmall() {
  return <ArrowUpRight size={15} />;
}

export function EditSupplier({ supplierId }: { supplierId: string }) {
  const { getSupplier, editSupplier } = useWorkspace();
  const supplier = getSupplier(supplierId)!.supplier;
  const [open, setOpen] = useState(false);
  const notify = useFeedback();
  const fields = [
    { key: "legalName", label: "Company name" },
    { key: "city", label: "City" },
    { key: "category", label: "Category" },
    { key: "registrationNumber", label: "Registration number" },
    { key: "website", label: "Website" },
    { key: "contactName", label: "Contact name" },
    { key: "contactEmail", label: "Contact email" },
  ] as const;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      fields.map((f) => [f.key, String(form.get(f.key) || "").trim()]),
    ) as Pick<typeof supplier, (typeof fields)[number]["key"]>;
    if (!values.legalName) return;
    editSupplier(supplierId, values);
    setOpen(false);
    notify(
      "Profile updated.",
      "Saved locally. Edited information requires review.",
    );
  }
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Edit profile <ArrowUpRight size={15} />
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="A clearer company profile."
      >
        <form className="workspace-form" onSubmit={submit}>
          <div className="form-grid">
            {fields.map((f) => (
              <FieldLabel key={f.key}>
                {f.label}
                <Input
                  name={f.key}
                  required={f.key === "legalName"}
                  maxLength={200}
                  type={f.key === "contactEmail" ? "email" : "text"}
                  defaultValue={
                    supplier[f.key] === "Not provided" ? "" : supplier[f.key]
                  }
                />
              </FieldLabel>
            ))}
          </div>
          <Button type="submit">
            Save profile <ArrowUpRight size={16} />
          </Button>
        </form>
        <p className="dialog-footnote">
          Local editing only. Supplier ownership and review permissions require
          the connected release.
        </p>
      </Dialog>
    </>
  );
}
export function CreateRequest() {
  const { supplierRows, requirements, createRequest } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const notify = useFeedback();
  const options = supplierRows.filter((r) =>
    requirements.some(
      (q) => q.relationshipId === r.relationship.id && q.status === "missing",
    ),
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      createRequest(
        String(form.get("supplier")),
        String(form.get("title")).trim(),
        String(form.get("due")),
      );
      setOpen(false);
      notify(
        "Request prepared.",
        "Saved locally. No email or invitation was sent.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    }
  }
  return (
    <>
      <Button
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        disabled={!options.length}
      >
        <Plus size={16} />
        Prepare request
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="A clear next step."
      >
        <p>
          Collect the missing requirements for a supplier into a local request.
        </p>
        <form className="workspace-form" onSubmit={submit}>
          <FieldLabel>
            Supplier
            <Select required name="supplier" defaultValue="">
              <option value="" disabled>
                Select supplier
              </option>
              {options.map((r) => (
                <option key={r.supplier.id} value={r.supplier.id}>
                  {r.supplier.legalName}
                </option>
              ))}
            </Select>
          </FieldLabel>
          <FieldLabel>
            Request title
            <Input
              required
              name="title"
              maxLength={160}
              placeholder="Please provide your missing compliance documents"
            />
          </FieldLabel>
          <FieldLabel>
            Due date
            <Input
              required
              type="date"
              name="due"
              min={new Date().toISOString().slice(0, 10)}
            />
          </FieldLabel>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit">
            Save local request <ArrowUpRight size={16} />
          </Button>
        </form>
        <p className="dialog-footnote">
          The request is prepared on this browser. Sending and supplier
          responses require hosted services.
        </p>
      </Dialog>
    </>
  );
}
