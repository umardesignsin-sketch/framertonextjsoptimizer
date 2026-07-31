"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/app/dashboard/theme/Icon";
import { Avatar } from "@/app/dashboard/theme/Avatar";

interface Props {
  email: string;
  avatarUrl: string;
  emailVerified: boolean;
  name: string;
  workspaceName: string;
  notifyConversion: boolean;
  notifyDeployment: boolean;
  notifyProduct: boolean;
}

export function SettingsView({
  email,
  avatarUrl,
  emailVerified,
  name: initialName,
  workspaceName: initialWorkspaceName,
  notifyConversion,
  notifyDeployment,
  notifyProduct,
}: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setNavOpen(false); };
    const wide = window.matchMedia("(min-width: 761px)");
    const onWide = () => { if (wide.matches) setNavOpen(false); };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [navOpen]);

  // ---- Profile ----
  const [name, setName] = useState(initialName);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    if (!name.trim() || !workspaceName.trim()) {
      setProfileError("Name and workspace are required.");
      return;
    }
    setSavingProfile(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), workspaceName: workspaceName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("Profile changes saved.");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingProfile(false);
    }
  }

  // ---- Security ----
  const [sendingReset, setSendingReset] = useState(false);

  async function sendPasswordReset() {
    if (sendingReset) return;
    setSendingReset(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw new Error(error.message);
      showToast(`Reset link sent to ${email}.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not send reset link");
    } finally {
      setSendingReset(false);
    }
  }

  // ---- Notifications ----
  const [notifications, setNotifications] = useState({
    notifyConversion,
    notifyDeployment,
    notifyProduct,
  });

  async function toggleNotification(key: keyof typeof notifications) {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error("Save failed");
      showToast(next[key] ? "Preference enabled." : "Preference disabled.");
    } catch {
      setNotifications(notifications); // revert on failure
      showToast("Could not save preference.");
    }
  }

  // ---- Sessions ----
  const [signingOut, setSigningOut] = useState(false);

  async function signOutEverywhere() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw new Error(error.message);
      window.location.assign("/login");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not sign out");
      setSigningOut(false);
    }
  }

  // ---- Danger zone ----
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE" || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      const supabase = createSupabaseBrowser();
      await supabase.auth.signOut();
      window.location.assign("/");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="settings-shell">
      <div
        className={`drawer-scrim${navOpen ? " is-open" : ""}`}
        hidden={!navOpen}
        onClick={() => setNavOpen(false)}
      />
      <aside className={`sidebar${navOpen ? " is-open" : ""}`} id="sidebar" aria-label="Workspace navigation">
        <Link className="brand" href="/dashboard" aria-label="FramerToNextJS dashboard">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>FramerToNextJS</span>
        </Link>
        <nav className="nav-list">
          <p className="nav-label">Workspace</p>
          <Link className="nav-item" href="/dashboard" onClick={() => setNavOpen(false)}>
            <Icon name="dashboard" />
            Dashboard
          </Link>
          <Link className="nav-item" href="/" onClick={() => setNavOpen(false)}>
            <Icon name="plus" />
            New conversion
          </Link>
          <Link className="nav-item" href="/dashboard#projects" onClick={() => setNavOpen(false)}>
            <Icon name="projects" />
            Projects
          </Link>
        </nav>
        <nav className="nav-list nav-secondary">
          <p className="nav-label">Settings</p>
          <a className="nav-item" aria-current="page" href="#profile"><Icon name="profile" />Profile</a>
          <a className="nav-item" href="#security"><Icon name="security" />Security</a>
          <a className="nav-item" href="#notifications"><Icon name="notification" />Notifications</a>
          <a className="nav-item" href="#sessions"><Icon name="sessions" />Sessions</a>
          <a className="nav-item danger-link" href="#danger"><Icon name="danger" />Danger Zone</a>
        </nav>
        <div className="sidebar-footer">
          <div className="workspace-switcher">
            <Avatar email={email} avatarUrl={avatarUrl} />
            <span>
              <strong>{workspaceName}</strong>
              <small>Settings</small>
            </span>
          </div>
        </div>
      </aside>

      <main id="main" className="main-content settings-main">
        <header className="topbar">
          <button
            className="icon-button nav-toggle"
            type="button"
            aria-label={navOpen ? "Close navigation" : "Open navigation"}
            aria-controls="sidebar"
            aria-expanded={navOpen}
            onClick={() => setNavOpen((v) => !v)}
          >
            <Icon name={navOpen ? "close" : "menu"} />
          </button>
          <div className="breadcrumb">
            <Link href="/dashboard">Workspace</Link>
            <b className="sep" aria-hidden="true">/</b>
            <strong aria-current="page">Settings</strong>
          </div>
          <div className="topbar-actions">
            <Avatar email={email} avatarUrl={avatarUrl} title={email} />
          </div>
        </header>

        <section className="settings-hero" aria-labelledby="settings-title">
          <div>
            <p className="eyebrow">Settings</p>
            <h1 id="settings-title">Account and workspace settings.</h1>
            <p>Manage identity, access, notifications, and account-level controls for FramerToNextJS.</p>
          </div>
        </section>

        <nav className="tabs settings-tabs" aria-label="Settings sections">
          <a href="#profile">Profile</a>
          <a href="#security">Security</a>
          <a href="#notifications">Notifications</a>
          <a href="#sessions">Sessions</a>
          <a href="#danger">Danger Zone</a>
        </nav>

        <section className="settings-grid">
          <div className="settings-column">
            <article className="panel" id="profile">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h2>Identity</h2>
                </div>
                <span className="status-chip is-neutral">Visible in workspace</span>
              </div>
              <form className="settings-form" onSubmit={saveProfile} noValidate>
                <div className="avatar-row">
                  <Avatar email={email} avatarUrl={avatarUrl} className="large-avatar" />
                  <div>
                    <strong>Profile image</strong>
                    <p>
                      Pulled from{" "}
                      <a href="https://gravatar.com" target="_blank" rel="noreferrer" className="text-link">
                        Gravatar
                      </a>
                      , based on your account email.
                    </p>
                  </div>
                </div>
                <div className="field-grid">
                  <label>
                    <span>Name</span>
                    <input value={name} onChange={(e) => setName(e.target.value)} type="text" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input value={email} type="email" disabled title="Change email from your identity provider" />
                  </label>
                  <label>
                    <span>Workspace</span>
                    <input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} type="text" />
                  </label>
                </div>
                {profileError && <p className="field-error">{profileError}</p>}
                <div className="panel-footer">
                  <span>Changes apply across dashboard, exports, and project ownership.</span>
                  <button className="primary-button" type="submit" disabled={savingProfile}>
                    <span>{savingProfile ? "Saving…" : "Save profile"}</span>
                    <Icon name="arrow-right" className="icon icon-sm" />
                  </button>
                </div>
              </form>
            </article>

            <article className="panel" id="security">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Security</p>
                  <h2>Password and verification</h2>
                </div>
                <span className={`status-chip ${emailVerified ? "is-success" : "is-warning"}`}>
                  {emailVerified ? "Email verified" : "Email not verified"}
                </span>
              </div>
              <div className="settings-list">
                <div className="settings-row">
                  <div>
                    <strong>Password</strong>
                    <p>We&rsquo;ll email you a secure link to set a new one.</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={sendPasswordReset} disabled={sendingReset}>
                    {sendingReset ? "Sending…" : "Send reset link"}
                  </button>
                </div>
              </div>
            </article>

            <article className="panel" id="notifications">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Notifications</p>
                  <h2>Email preferences</h2>
                </div>
              </div>
              <div className="settings-list">
                <div className="settings-row">
                  <div>
                    <strong id="notify-conversion-label">Conversion complete</strong>
                    <p id="notify-conversion-desc">Email me when long-running conversions finish.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notifications.notifyConversion}
                      onChange={() => toggleNotification("notifyConversion")}
                      aria-labelledby="notify-conversion-label"
                      aria-describedby="notify-conversion-desc"
                    />
                    <span></span>
                  </label>
                </div>
                <div className="settings-row">
                  <div>
                    <strong id="notify-deployment-label">Deployment updates</strong>
                    <p id="notify-deployment-desc">Receive deployment status and failed build alerts.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notifications.notifyDeployment}
                      onChange={() => toggleNotification("notifyDeployment")}
                      aria-labelledby="notify-deployment-label"
                      aria-describedby="notify-deployment-desc"
                    />
                    <span></span>
                  </label>
                </div>
                <div className="settings-row">
                  <div>
                    <strong id="notify-product-label">Product updates</strong>
                    <p id="notify-product-desc">Occasional release notes for export quality and framework support.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={notifications.notifyProduct}
                      onChange={() => toggleNotification("notifyProduct")}
                      aria-labelledby="notify-product-label"
                      aria-describedby="notify-product-desc"
                    />
                    <span></span>
                  </label>
                </div>
              </div>
              <div className="notice empty-inline" id="notification-history">
                <Icon name="info" className="icon icon-sm" />
                <p>
                  Preferences save for real, but email delivery isn&rsquo;t connected yet — nothing will be sent
                  until that&rsquo;s wired up.
                </p>
              </div>
            </article>

            <article className="panel danger-panel" id="danger">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Danger Zone</p>
                  <h2>Destructive actions</h2>
                </div>
              </div>
              <div className="settings-list">
                <div className="settings-row">
                  <div>
                    <strong>Delete account</strong>
                    <p>Permanently remove your account, projects, exports, and deployment history.</p>
                  </div>
                  <button className="danger-button" type="button" onClick={() => setDeleteOpen(true)}>
                    Delete account
                  </button>
                </div>
              </div>
            </article>
          </div>

          <aside className="side-column">
            <article className="panel" id="sessions">
              <div className="panel-heading compact">
                <div>
                  <p className="eyebrow">Sessions</p>
                  <h2>This device</h2>
                </div>
              </div>
              <div className="settings-list">
                <div className="settings-row">
                  <div>
                    <strong>Signed in as {email}</strong>
                    <p>Sign out of this account on every device, everywhere.</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={signOutEverywhere} disabled={signingOut}>
                    {signingOut ? "Signing out…" : "Sign out everywhere"}
                  </button>
                </div>
              </div>
            </article>
          </aside>
        </section>
      </main>

      {deleteOpen && (
        <div className="drawer-scrim is-open" onClick={() => !deleting && setDeleteOpen(false)}>
          <div
            className="confirm-dialog danger-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-button"
              type="button"
              aria-label="Close"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              <Icon name="close" className="icon icon-sm" />
            </button>
            <p className="eyebrow">Delete account</p>
            <h2 id="delete-title">This cannot be undone.</h2>
            <p>Deleting your account permanently removes projects, exports, account settings, and deployment history.</p>
            <label className="confirm-field">
              <span>Type DELETE to confirm</span>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                type="text"
                autoComplete="off"
              />
            </label>
            {deleteError && <p className="field-error">{deleteError}</p>}
            <menu style={{ display: "flex", gap: "9px", justifyContent: "flex-end", margin: "24px 0 0", padding: 0 }}>
              <button className="secondary-button" type="button" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={deleteConfirm !== "DELETE" || deleting}
                onClick={deleteAccount}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </button>
            </menu>
          </div>
        </div>
      )}

      <div className="toast" role="status" aria-live="polite" hidden={!toast}>
        {toast}
      </div>
    </div>
  );
}
