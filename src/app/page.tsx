"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AdminTopbar from "@/components/admin-topbar";
import PaginationControls from "@/components/pagination-controls";
import type {
  HumorFlavorSummary,
  ThemePreference,
} from "@/lib/humor-flavor-types";
import { slugifyFlavor } from "@/lib/humor-flavor-utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  applyThemePreference,
  getStoredThemePreference,
  saveThemePreference,
  subscribeToSystemThemeChanges,
} from "@/lib/theme-client";

const EMPTY_FLAVOR_FORM = {
  slug: "",
  description: "",
  captionCount: "5",
};

const FLAVORS_PER_PAGE = 6;

export default function HomePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [flavors, setFlavors] = useState<HumorFlavorSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FLAVOR_FORM);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FLAVOR_FORM);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [error, setError] = useState<string | null>(null);
  const [requestedFlavorPage, setRequestedFlavorPage] = useState(1);
  const createSlugInputRef = useRef<HTMLInputElement | null>(null);
  const totalSteps = flavors.reduce((sum, flavor) => sum + flavor.stepCount, 0);
  const totalCaptions = flavors.reduce(
    (sum, flavor) => sum + (flavor.captionCount ?? 0),
    0
  );
  const totalFlavorPages = Math.max(
    1,
    Math.ceil(flavors.length / FLAVORS_PER_PAGE)
  );
  const flavorPage = Math.min(requestedFlavorPage, totalFlavorPages);
  const visibleFlavors = flavors.slice(
    (flavorPage - 1) * FLAVORS_PER_PAGE,
    flavorPage * FLAVORS_PER_PAGE
  );

  useEffect(() => {
    const storedTheme = getStoredThemePreference();
    setTheme(storedTheme);
    applyThemePreference(storedTheme);

    return subscribeToSystemThemeChanges(() => {
      if (getStoredThemePreference() === "system") {
        applyThemePreference("system");
      }
    });
  }, []);

  useEffect(() => {
    async function loadPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserName(user.user_metadata?.full_name ?? null);
      setUserEmail(user.email ?? null);
      await fetchFlavors();
    }

    void loadPage();
  }, [router, supabase]);

  useEffect(() => {
    if (showCreate) {
      createSlugInputRef.current?.focus();
    }
  }, [showCreate]);

  async function fetchFlavors() {
    try {
      setError(null);
      const response = await fetch("/api/humor-flavors", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load humor flavors.");
      }

      setFlavors(payload);
      setReady(true);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load humor flavors."
      );
    }
  }

  function handleThemeChange(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    saveThemePreference(nextTheme);
  }

  function handleSignOut() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

  function startEdit(flavor: HumorFlavorSummary) {
    setEditingId(flavor.id);
    setEditForm({
      slug: flavor.slug,
      description: flavor.description ?? "",
      captionCount: String(flavor.captionCount ?? 5),
    });
  }

  function handleToggleCreate() {
    if (!showCreate && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setEditingId(null);
    }

    setShowCreate((current) => !current);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSubmittingCreate(true);
      setError(null);

      const response = await fetch("/api/humor-flavors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slugifyFlavor(createForm.slug),
          description: createForm.description,
          captionCount: Number(createForm.captionCount || 0),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to create humor flavor.");
      }

      setCreateForm(EMPTY_FLAVOR_FORM);
      setShowCreate(false);
      await fetchFlavors();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create humor flavor."
      );
    } finally {
      setSubmittingCreate(false);
    }
  }

  async function handleUpdate(id: number) {
    try {
      setSavingId(id);
      setError(null);

      const response = await fetch(`/api/humor-flavors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slugifyFlavor(editForm.slug),
          description: editForm.description,
          captionCount: Number(editForm.captionCount || 0),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to update humor flavor.");
      }

      setEditingId(null);
      await fetchFlavors();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update humor flavor."
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: number, slug: string) {
    if (!window.confirm(`Delete "${slug}" and all of its steps?`)) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      const response = await fetch(`/api/humor-flavors/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete humor flavor.");
      }

      await fetchFlavors();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete humor flavor."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-shell min-h-screen">
      <AdminTopbar
        title="Humor Flavors"
        subtitle="Shape prompt chains like an editorial test bench, then open any flavor to tune steps, run image probes, and compare outputs."
        userName={userName}
        userEmail={userEmail}
        theme={theme}
        onThemeChange={handleThemeChange}
        onSignOut={handleSignOut}
        action={
          <button
            onClick={handleToggleCreate}
            className="btn-primary"
          >
            {showCreate ? "Close form" : "New flavor"}
          </button>
        }
      />

      <main className="admin-main space-y-8 px-2 py-2 sm:px-0">
        {error ? (
          <div className="status-banner status-banner-danger section-enter section-enter-delay-1">
            {error}
          </div>
        ) : null}

        {showCreate ? (
          <section className="panel-muted section-enter section-enter-delay-1 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="eyebrow">New Workspace</p>
              <h2 className="text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                Create a new flavor
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[var(--muted-foreground)]">
                Give the flavor a crisp slug, a short note about its comedic
                intent, and the caption count you want each run to target.
              </p>
            </div>

            <form
              onSubmit={handleCreate}
              className="mt-5 space-y-4"
            >
              <div className="grid gap-4 lg:grid-cols-[2.2fr_1fr]">
                <label className="field-stack">
                  <span className="field-label">Flavor slug</span>
                  <input
                    ref={createSlugInputRef}
                    type="text"
                    value={createForm.slug}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        slug: event.target.value,
                      }))
                    }
                    placeholder="dry-campus-deadpan"
                    required
                    className="field-control"
                  />
                </label>

                <label className="field-stack">
                  <span className="field-label">Captions per run</span>
                  <input
                    type="number"
                    min={0}
                    value={createForm.captionCount}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        captionCount: event.target.value,
                      }))
                    }
                    className="field-control"
                  />
                </label>
              </div>

              <label className="field-stack">
                <span className="field-label">Flavor direction</span>
                <textarea
                  rows={4}
                  value={createForm.description}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="A dry, observant voice that feels sharp in testing but not cynical."
                  className="field-control min-h-32"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="btn-primary w-full sm:w-auto"
                >
                  {submittingCreate ? "Creating..." : "Create workspace"}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        {!ready ? null : flavors.length === 0 ? (
          <div className="section-enter section-enter-delay-2 py-16 text-center text-sm text-[var(--muted-foreground)]">
            No humor flavors yet. Create one to start building a prompt chain.
          </div>
        ) : (
          <section className="section-enter section-enter-delay-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Flavor Inventory</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                  Active workspaces
                </h2>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  {flavors.length} flavors / {totalSteps} steps / {totalCaptions} captions / run
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {visibleFlavors.map((flavor) => (
                <section
                  key={flavor.id}
                  className="panel card-interactive section-enter section-enter-delay-3 h-full p-5 sm:p-6"
                >
                  {editingId === flavor.id ? (
                    <div className="space-y-4">
                      <div>
                        <p className="eyebrow">Edit Workspace</p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                          {flavor.slug}
                        </h3>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[2.2fr_1fr]">
                        <label className="field-stack">
                          <span className="field-label">Flavor slug</span>
                          <input
                            type="text"
                            value={editForm.slug}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                slug: event.target.value,
                              }))
                            }
                            className="field-control"
                          />
                        </label>

                        <label className="field-stack">
                          <span className="field-label">Captions per run</span>
                          <input
                            type="number"
                            min={0}
                            value={editForm.captionCount}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                captionCount: event.target.value,
                              }))
                            }
                            className="field-control"
                          />
                        </label>
                      </div>

                      <label className="field-stack">
                        <span className="field-label">Flavor direction</span>
                        <textarea
                          rows={4}
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          className="field-control min-h-32"
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => void handleUpdate(flavor.id)}
                          disabled={savingId === flavor.id}
                          className="btn-primary"
                        >
                          {savingId === flavor.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col gap-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="eyebrow">Flavor Workspace</p>
                            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">
                              {flavor.slug}
                            </h2>
                          </div>
                          <p className="text-xs font-mono uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                            ID {flavor.id}
                          </p>
                        </div>

                        <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                          {flavor.description ||
                            "No flavor direction saved yet. Add one so the chain reads like a designed experiment instead of a loose prompt list."}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-[var(--muted-foreground)]">
                        <span>{flavor.stepCount} steps</span>
                        <span>/</span>
                        <span>{flavor.captionCount ?? 0} captions / run</span>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-2">
                        <Link
                          href={`/flavors/${flavor.id}`}
                          className="btn-primary"
                        >
                          Open flavor
                        </Link>
                        <button
                          onClick={() => startEdit(flavor)}
                          className="btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDelete(flavor.id, flavor.slug)}
                          disabled={deletingId === flavor.id}
                          className="btn-danger"
                        >
                          {deletingId === flavor.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ))}
            </div>

            <PaginationControls
              page={flavorPage}
              totalPages={totalFlavorPages}
              onPageChange={setRequestedFlavorPage}
            />
          </section>
        )}
      </main>
    </div>
  );
}
