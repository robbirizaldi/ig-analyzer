/**
 * Instagram Follow Analyzer - Standalone Client-Side Application
 * 100% Client-Side. No external dependencies. Safe for GitHub Pages.
 */

(() => {
  "use strict";

  /* -------------------------------------------------------------
     1. Theme Management (Flat Light / Soft Dark)
     ------------------------------------------------------------- */
  const THEME_KEY = "ig_analyzer_theme";

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);

    const sunIcon = document.getElementById("iconSun");
    const moonIcon = document.getElementById("iconMoon");
    if (sunIcon && moonIcon) {
      if (theme === "dark") {
        sunIcon.style.display = "inline";
        moonIcon.style.display = "none";
      } else {
        sunIcon.style.display = "none";
        moonIcon.style.display = "inline";
      }
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(current);
  }

  // Initialize theme immediately
  applyTheme(getPreferredTheme());

  /* -------------------------------------------------------------
     2. Analyzer State & Core Logic
     ------------------------------------------------------------- */
  const state = {
    followers: new Map(),
    following: new Map(),
    recentUnfollows: new Map(),
    view: "not_following_back",
    search: "",
    sort: "username_asc",
  };

  const uploadedFiles = {
    followers: [],
    following: [],
    unfollowed: [],
  };

  function $(selector) {
    return document.querySelector(selector);
  }

  function normalizeUsername(value) {
    return String(value || "")
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[char],
    );
  }

  function getStringListData(item) {
    return Array.isArray(item?.string_list_data) ? item.string_list_data : [];
  }

  function getLabelValue(item, labels) {
    const wanted = new Set(labels.map((v) => v.toLowerCase()));
    const found = Array.isArray(item?.label_values)
      ? item.label_values.find((entry) =>
          wanted.has(String(entry?.label || "").toLowerCase()),
        )
      : null;
    return found?.value || "";
  }

  function recordFromItem(item, forcedUsername = "") {
    if (!item || typeof item !== "object") return null;

    const first = getStringListData(item)[0] || {};
    const rawUsername =
      forcedUsername ||
      first.value ||
      item.title ||
      getLabelValue(item, ["Username", "username", "Name", "name"]) ||
      item.value ||
      "";

    const username = normalizeUsername(rawUsername);
    if (!username) return null;

    const href =
      first.href ||
      getLabelValue(item, ["URL", "Profile URL", "profile_url"]) ||
      `https://www.instagram.com/${encodeURIComponent(username)}/`;

    const timestamp = Number(first.timestamp || item.timestamp || 0) || 0;

    return {
      username,
      href,
      timestamp,
    };
  }

  function extractRecordsFromJson(rawJson, type) {
    let list = [];

    if (Array.isArray(rawJson)) {
      list = rawJson;
    } else if (rawJson && typeof rawJson === "object") {
      const preferredKeys = {
        followers: ["relationships_followers"],
        following: ["relationships_following"],
        unfollowed: ["relationships_unfollowed_users"],
      };

      for (const key of preferredKeys[type] || []) {
        if (Array.isArray(rawJson[key])) {
          list = rawJson[key];
          break;
        }
      }

      if (!list.length) {
        const firstArray = Object.values(rawJson).find((value) =>
          Array.isArray(value),
        );
        if (firstArray) list = firstArray;
      }
    }

    return list.map((item) => recordFromItem(item)).filter(Boolean);
  }

  function detectType(filename, rawJson) {
    const lower = String(filename || "").toLowerCase();

    if (lower.includes("recently_unfollowed")) return "unfollowed";
    if (lower.includes("unfollowed")) return "unfollowed";
    if (lower.includes("following") && !lower.includes("followers"))
      return "following";
    if (lower.includes("followers")) return "followers";

    if (rawJson && typeof rawJson === "object") {
      if (Array.isArray(rawJson.relationships_following)) return "following";
      if (Array.isArray(rawJson.relationships_followers)) return "followers";
      if (Array.isArray(rawJson.relationships_unfollowed_users))
        return "unfollowed";
    }

    return null;
  }

  function rebuildState() {
    state.followers.clear();
    state.following.clear();
    state.recentUnfollows.clear();

    for (const file of uploadedFiles.followers) {
      for (const record of extractRecordsFromJson(file.data, "followers")) {
        state.followers.set(record.username, record);
      }
    }

    for (const file of uploadedFiles.following) {
      for (const record of extractRecordsFromJson(file.data, "following")) {
        state.following.set(record.username, record);
      }
    }

    for (const file of uploadedFiles.unfollowed) {
      for (const record of extractRecordsFromJson(file.data, "unfollowed")) {
        state.recentUnfollows.set(record.username, record);
      }
    }
  }

  function setStatus(id, text, loaded) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("loaded", Boolean(loaded));
  }

  function updateUploadStatuses() {
    const followersCount = state.followers.size;
    const followingCount = state.following.size;
    const unfollowedCount = state.recentUnfollows.size;

    setStatus(
      "statusFollowers",
      uploadedFiles.followers.length
        ? `Loaded: ${followersCount.toLocaleString()} profiles (${uploadedFiles.followers.length} file${uploadedFiles.followers.length === 1 ? "" : "s"})`
        : "Ready (0 profiles)",
      uploadedFiles.followers.length > 0,
    );

    setStatus(
      "statusFollowing",
      uploadedFiles.following.length
        ? `Loaded: ${followingCount.toLocaleString()} profiles (${uploadedFiles.following.length} file${uploadedFiles.following.length === 1 ? "" : "s"})`
        : "Ready (0 profiles)",
      uploadedFiles.following.length > 0,
    );

    setStatus(
      "statusUnfollowed",
      uploadedFiles.unfollowed.length
        ? `Loaded: ${unfollowedCount.toLocaleString()} profiles (${uploadedFiles.unfollowed.length} file${uploadedFiles.unfollowed.length === 1 ? "" : "s"})`
        : "Optional (0 profiles)",
      uploadedFiles.unfollowed.length > 0,
    );
  }

  function showAlert(message, isError = false) {
    const box = $("#alertBox");
    if (!box) return;

    box.textContent = message;
    box.className = isError
      ? "alert-box alert-error"
      : "alert-box alert-success";
    box.style.display = "block";
  }

  function hideAlert() {
    const box = $("#alertBox");
    if (!box) return;
    box.style.display = "none";
    box.textContent = "";
    box.className = "alert-box";
  }

  async function readJsonFile(file) {
    if (!file.name.toLowerCase().endsWith(".json")) {
      throw new Error(`${file.name}: only .json files are accepted.`);
    }

    const text = await file.text();

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`${file.name} is not valid JSON.`);
    }
  }

  async function handleFiles(fileList, type) {
    if (!fileList || !fileList.length) return;

    try {
      const incoming = [];

      for (const file of Array.from(fileList)) {
        const data = await readJsonFile(file);
        const detected = detectType(file.name, data);

        if (detected && detected !== type) {
          throw new Error(
            `${file.name} appears to be a ${detected} export, not ${type}.`,
          );
        }

        if (!detected && !type) {
          throw new Error(`Could not identify ${file.name}.`);
        }

        incoming.push({ name: file.name, data });
      }

      if (type === "followers") {
        uploadedFiles.followers.push(...incoming);
      } else {
        uploadedFiles[type] = incoming;
      }

      rebuildState();
      updateUploadStatuses();
      renderAll();

      showAlert(
        `${incoming.length} JSON file${incoming.length === 1 ? "" : "s"} loaded successfully.`,
        false,
      );
    } catch (error) {
      showAlert(
        error?.message || "Unable to read the uploaded JSON file.",
        true,
      );
    }
  }

  function getComputedLists() {
    const notFollowingBack = [];
    const fans = [];
    const mutuals = [];

    for (const [username, data] of state.following.entries()) {
      if (state.followers.has(username)) {
        mutuals.push(data);
      } else {
        notFollowingBack.push(data);
      }
    }

    for (const [username, data] of state.followers.entries()) {
      if (!state.following.has(username)) {
        fans.push(data);
      }
    }

    return {
      not_following_back: notFollowingBack,
      fans,
      mutuals,
      unfollowed: Array.from(state.recentUnfollows.values()),
      following: Array.from(state.following.values()),
      followers: Array.from(state.followers.values()),
    };
  }

  function getActiveRows() {
    const lists = getComputedLists();
    let rows = [...(lists[state.view] || [])];

    if (state.search) {
      const query = state.search.toLowerCase();
      rows = rows.filter((row) => row.username.includes(query));
    }

    rows.sort((a, b) => {
      if (state.sort === "username_asc")
        return a.username.localeCompare(b.username);
      if (state.sort === "username_desc")
        return b.username.localeCompare(a.username);
      if (state.sort === "newest")
        return (b.timestamp || 0) - (a.timestamp || 0);
      if (state.sort === "oldest")
        return (a.timestamp || 0) - (b.timestamp || 0);
      return 0;
    });

    return { rows, lists };
  }

  function formatDate(timestamp) {
    if (!timestamp) return "-";
    const date = new Date(timestamp * 1000);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toISOString().slice(0, 10);
  }

  function renderAll() {
    const { rows, lists } = getActiveRows();

    const setStat = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Number(value).toLocaleString();
    };

    setStat("countFollowers", lists.followers.length);
    setStat("countFollowing", lists.following.length);
    setStat("countNotFollowingBack", lists.not_following_back.length);
    setStat("countFans", lists.fans.length);
    setStat("countMutuals", lists.mutuals.length);
    setStat("countUnfollowed", lists.unfollowed.length);

    const tbody = $("#resultsTableBody");
    if (!tbody) return;

    const hasData =
      state.followers.size ||
      state.following.size ||
      state.recentUnfollows.size;

    if (!hasData) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-row">Upload your Instagram JSON files above and click ANALYZE DATA.</td></tr>';
      return;
    }

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="empty-row">No matching profiles found in this category.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(
        (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>@${escapeHtml(item.username)}</strong></td>
        <td><a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer" class="profile-link">Open Profile &nearr;</a></td>
        <td>${formatDate(item.timestamp)}</td>
      </tr>
    `,
      )
      .join("");
  }

  function analyze() {
    rebuildState();
    updateUploadStatuses();
    renderAll();

    if (!uploadedFiles.followers.length || !uploadedFiles.following.length) {
      showAlert(
        "Please upload both Followers and Following JSON files first.",
        true,
      );
      return;
    }

    hideAlert();

    const results = $("#resultsSection");
    if (results) {
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function resetAll() {
    state.followers.clear();
    state.following.clear();
    state.recentUnfollows.clear();

    uploadedFiles.followers = [];
    uploadedFiles.following = [];
    uploadedFiles.unfollowed = [];

    const ids = ["inputFollowers", "inputFollowing", "inputUnfollowed"];
    ids.forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = "";
    });

    setStatus("statusFollowers", "Ready (0 profiles)", false);
    setStatus("statusFollowing", "Ready (0 profiles)", false);
    setStatus("statusUnfollowed", "Optional (0 profiles)", false);

    state.search = "";
    state.view = "not_following_back";
    state.sort = "username_asc";

    const search = $("#searchInput");
    if (search) search.value = "";

    const sort = $("#sortSelect");
    if (sort) sort.value = state.sort;

    document.querySelectorAll("#viewTabs .tab-btn").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === state.view);
    });

    hideAlert();
    renderAll();
  }

  function downloadCsv() {
    const { rows } = getActiveRows();

    if (!rows.length) {
      showAlert("No profiles available in the current view to export.", true);
      return;
    }

    const headers = ["No", "Username", "Profile URL", "Timestamp", "Date"];
    const csv = [headers.join(",")];

    rows.forEach((item, index) => {
      const safe = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      csv.push(
        [
          index + 1,
          safe(item.username),
          safe(item.href),
          item.timestamp || 0,
          safe(formatDate(item.timestamp)),
        ].join(","),
      );
    });

    const blob = new Blob([csv.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `instagram_${state.view}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /* -------------------------------------------------------------
     3. DOM Event Listeners & Boot
     ------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    // Current year updater
    const currentYear = String(new Date().getFullYear());
    document.querySelectorAll(".current-year").forEach((el) => {
      el.textContent = currentYear;
    });

    // Theme toggle button
    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", toggleTheme);
    }

    // Scroll to top button
    const topBtn = document.querySelector(".page-to-top");
    if (topBtn) {
      topBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({
          top: 0,
          behavior: prefersReduced ? "instant" : "smooth",
        });
      });
    }

    // File inputs
    $("#inputFollowers")?.addEventListener("change", (event) => {
      handleFiles(event.target.files, "followers");
    });

    $("#inputFollowing")?.addEventListener("change", (event) => {
      handleFiles(event.target.files, "following");
    });

    $("#inputUnfollowed")?.addEventListener("change", (event) => {
      handleFiles(event.target.files, "unfollowed");
    });

    // Buttons
    $("#btnAnalyze")?.addEventListener("click", analyze);
    $("#btnReset")?.addEventListener("click", resetAll);
    $("#btnDownloadCsv")?.addEventListener("click", downloadCsv);

    // Search and Sort
    $("#searchInput")?.addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      renderAll();
    });

    $("#sortSelect")?.addEventListener("change", (event) => {
      state.sort = event.target.value;
      renderAll();
    });

    // View tabs
    $("#viewTabs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-view]");
      if (!button) return;

      state.view = button.dataset.view;
      document.querySelectorAll("#viewTabs .tab-btn").forEach((tab) => {
        tab.classList.toggle("active", tab === button);
      });

      renderAll();
    });

    renderAll();
    updateUploadStatuses();
  });
})();
