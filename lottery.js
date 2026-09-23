"use strict";

const API_BASE_URL = "https://newsapi.winmen.com.tw";

const loading = document.getElementById("loading");
const errorCard = document.getElementById("error");
const errorMessage = document.getElementById("errorMessage");
const retryButton = document.getElementById("retryButton");
const mainScreen = document.getElementById("mainScreen");

const eligibleCount = document.getElementById("eligibleCount");
const availablePrizeCount = document.getElementById("availablePrizeCount");
const statusTitle = document.getElementById("statusTitle");
const statusMessage = document.getElementById("statusMessage");

const drawButton = document.getElementById("drawButton");
const drawingCard = document.getElementById("drawingCard");
const countdown = document.getElementById("countdown");
const resultCard = document.getElementById("resultCard");
const winnerName = document.getElementById("winnerName");
const prizeName = document.getElementById("prizeName");
const prizeDescription = document.getElementById("prizeDescription");
const resultMessage = document.getElementById("resultMessage");
const continueButton = document.getElementById("continueButton");

const prizeList = document.getElementById("prizeList");
const winnerHistory = document.getElementById("winnerHistory");

let isDrawing = false;
let canDraw = false;

document.addEventListener("DOMContentLoaded", startApp);
retryButton?.addEventListener("click", () => window.location.reload());
drawButton?.addEventListener("click", drawLottery);
continueButton?.addEventListener("click", () => {
    resultCard?.classList.add("hidden");
    refreshStatus();
});

async function startApp() {
    showLoading();
    await refreshStatus();
}

function showLoading() {
    loading?.classList.remove("hidden");
    errorCard?.classList.add("hidden");
    mainScreen?.classList.add("hidden");
}

function showMainScreen() {
    loading?.classList.add("hidden");
    errorCard?.classList.add("hidden");
    mainScreen?.classList.remove("hidden");
}

function showError(message) {
    loading?.classList.add("hidden");
    mainScreen?.classList.add("hidden");
    errorCard?.classList.remove("hidden");

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

async function readJson(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`伺服器回應格式錯誤（HTTP ${response.status}）`);
    }
}

async function apiRequest(path, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                ...(options.body ? { "Content-Type": "application/json" } : {}),
                ...options.headers
            }
        });
    } catch (error) {
        throw new Error("無法連線抽獎伺服器，請確認網路或 API 狀態。");
    }

    const data = await readJson(response);

    if (!response.ok || data.success !== true) {
        throw new Error(data.message || `伺服器錯誤（HTTP ${response.status}）`);
    }

    return data;
}

async function refreshStatus() {
    try {
        const data = await apiRequest("/api/lottery/status");

        showMainScreen();
        renderStatus(data);
        renderPrizes(data.prizes || []);
        renderWinners(data.winners || []);
    } catch (error) {
        console.error("[LOTTERY STATUS]", error);
        showError(error.message || "無法載入抽獎資料。");
    }
}

function renderStatus(data) {
    const count = Number(data.eligibleCount) || 0;
    const prizes = Array.isArray(data.prizes) ? data.prizes : [];
    const available = prizes.filter((prize) => Number(prize.remaining) > 0);

    if (eligibleCount) eligibleCount.textContent = String(count);
    if (availablePrizeCount) {
        availablePrizeCount.textContent = String(available.length);
    }

    canDraw = count > 0 && available.length > 0;

    if (canDraw) {
        setStatus("抽獎準備完成", `目前有 ${count} 位合資格參加者。`);
        drawButton.disabled = false;
        drawButton.textContent = "🎰 開始抽獎";
    } else if (count === 0) {
        setStatus("目前沒有可抽獎名單", "LotteryEntries 中沒有尚可抽獎的合資格資料。");
        drawButton.disabled = true;
        drawButton.textContent = "目前沒有合資格名單";
    } else {
        setStatus("獎項已抽完", "目前沒有尚有名額的啟用獎項。");
        drawButton.disabled = true;
        drawButton.textContent = "獎項已抽完";
    }
}

function setStatus(title, message) {
    if (statusTitle) statusTitle.textContent = title;
    if (statusMessage) statusMessage.textContent = message;
}

function renderPrizes(prizes) {
    if (!prizeList) return;
    prizeList.replaceChildren();

    const available = prizes.filter((prize) => Number(prize.remaining) > 0);

    if (available.length === 0) {
        prizeList.append(makeEmptyMessage("目前沒有剩餘獎項"));
        return;
    }

    for (const prize of available) {
        const row = document.createElement("div");
        row.className = "prize-item";

        const name = document.createElement("div");
        name.className = "prize-item-name";
        name.textContent = prize.name || "獎項";

        const quantity = document.createElement("div");
        quantity.className = "prize-item-count";
        quantity.textContent = `剩餘 ${prize.remaining} 份`;

        row.append(name, quantity);
        prizeList.appendChild(row);
    }
}

function renderWinners(winners) {
    if (!winnerHistory) return;
    winnerHistory.replaceChildren();

    if (!Array.isArray(winners) || winners.length === 0) {
        winnerHistory.append(makeEmptyMessage("目前還沒有得獎紀錄"));
        return;
    }

    for (const winner of winners) {
        const row = document.createElement("div");
        row.className = "winner-item";

        const name = document.createElement("div");
        name.className = "winner-item-name";
        name.textContent = `${winner.displayName || "得獎者"} — ${winner.prizeName || "獎項"}`;

        const time = document.createElement("div");
        time.className = "winner-item-time";
        time.textContent = formatDate(winner.wonAt);

        row.append(name, time);
        winnerHistory.appendChild(row);
    }
}

function makeEmptyMessage(message) {
    const element = document.createElement("div");
    element.className = "empty-message";
    element.textContent = message;
    return element;
}

async function drawLottery() {
    if (isDrawing || !canDraw) return;

    isDrawing = true;
    drawButton.disabled = true;
    drawButton.textContent = "抽獎中...";

    try {
        await showCountdown();

        const data = await apiRequest("/api/lottery/draw", {
            method: "POST",
            body: "{}"
        });

        const winner = data.winner || {};
        const prize = data.prize || {};

        if (winnerName) {
            winnerName.textContent = winner.displayName || "得獎者";
        }
        if (prizeName) {
            prizeName.textContent = prize.name || "恭喜中獎";
        }
        if (prizeDescription) {
            prizeDescription.textContent = prize.description || "";
        }
        if (resultMessage) {
            resultMessage.textContent = data.message || "恭喜得獎！";
        }

        resultCard?.classList.remove("hidden");
        await refreshStatus();
    } catch (error) {
        console.error("[DRAW]", error);
        setStatus("抽獎失敗", error.message || "抽獎發生錯誤。");
        await refreshStatus();
    } finally {
        isDrawing = false;
        drawingCard?.classList.add("hidden");
    }
}

async function showCountdown() {
    if (!drawingCard) return;

    resultCard?.classList.add("hidden");
    drawingCard.classList.remove("hidden");

    for (const value of ["3", "2", "1", "GO!"]) {
        if (countdown) countdown.textContent = value;
        await delay(value === "GO!" ? 400 : 600);
    }
}

function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
