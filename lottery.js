"use strict";

const API_BASE_URL = "https://newsapi.winmen.com.tw";
const LIFF_ID = "2011685953-o8qvyQfR";

const $ = (id) => document.getElementById(id);

const loading = $("loading");
const mainScreen = $("mainScreen");
const errorCard = $("error");
const errorMessage = $("errorMessage");
const retryButton = $("retryButton");

const participantName = $("participantName");
const progressText = $("progressText");
const progressBar = $("progressBar");
const missionProgress = $("missionProgress");

const statusTitle = $("statusTitle");
const statusMessage = $("statusMessage");

const drawCard = $("drawCard");
const drawButton = $("drawButton");
const drawingCard = $("drawingCard");
const countdown = $("countdown");

const resultCard = $("resultCard");
const resultIcon = $("resultIcon");
const prizeName = $("prizeName");
const prizeDescription = $("prizeDescription");
const resultMessage = $("resultMessage");
const drawAgainButton = $("drawAgainButton");
const closeResultButton = $("closeResultButton");

const winnerList = $("winnerList");

let lineUserId = "";
let isDrawing = false;
let lotteryCanDraw = false;

document.addEventListener("DOMContentLoaded", startApp);

retryButton?.addEventListener("click", () => {
    window.location.reload();
});

drawButton?.addEventListener("click", drawLottery);

drawAgainButton?.addEventListener("click", async () => {
    if (isDrawing || !lotteryCanDraw) return;

    resultCard?.classList.add("hidden");
    await delay(200);
    await drawLottery();
});

closeResultButton?.addEventListener("click", () => {
    resultCard?.classList.add("hidden");
    drawCard?.classList.remove("hidden");
});

async function startApp() {
    try {
        showLoading("正在初始化 LINE...");

        if (!window.liff) {
            throw new Error("LINE LIFF SDK 載入失敗，請重新整理頁面。");
        }

        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
            showLoading("正在開啟 LINE 登入...");
            liff.login({ redirectUri: window.location.href });
            return;
        }

        showLoading("正在取得 LINE 使用者資料...");
        const profile = await liff.getProfile();

        if (!profile?.userId) {
            throw new Error("無法取得 LINE 使用者資料。");
        }

        lineUserId = profile.userId;
     
        if (participantName) {
            participantName.textContent = profile.displayName || "-";
        }

        mainScreen?.classList.remove("hidden");

        const progress = await loadProgress();
        await loadLotteryStatus();

        // 進度未完成時，以進度結果為準停用抽獎。
        if (!progress.allCompleted) {
            lotteryCanDraw = false;
            disableDraw("尚未完成六關");
            setStatus(
                "尚未取得抽獎資格",
                `目前完成 ${progress.completedCount} / ${progress.totalMissions} 關，請先完成全部闖關任務。`
            );
        }
    } catch (error) {
        console.error("[LOTTERY] 初始化失敗", error);
        showError(error?.message || "系統初始化失敗，請稍後再試。");
    }
}

function showLoading(message) {
    if (!loading) return;

    loading.classList.remove("hidden");
    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <p id="loadingText">${escapeHtml(message)}</p>
    `;
}

function showError(message) {
    loading?.classList.add("hidden");
    mainScreen?.classList.add("hidden");
    errorCard?.classList.remove("hidden");

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}

function showMainScreen() {
    loading?.classList.add("hidden");
    errorCard?.classList.add("hidden");
    mainScreen?.classList.remove("hidden");
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const text = await response.text();

    let data = {};
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`伺服器回應格式錯誤（HTTP ${response.status}）。`);
        }
    }

    if (!response.ok || data.success !== true) {
        throw new Error(data.message || `請求失敗（HTTP ${response.status}）。`);
    }

    return data;
}

async function loadProgress() {
    const query = new URLSearchParams({
        lineUserId,
        employeeNo
    });

    const data = await fetchJson(
        `${API_BASE_URL}/api/game/progress?${query.toString()}`,
        { headers: { Accept: "application/json" } }
    );

    const missions = Array.isArray(data.missions) ? data.missions : [];
    const totalMissions = Number(data.totalMissions) || missions.length;
    const completedCount = Number.isFinite(Number(data.completedCount))
        ? Number(data.completedCount)
        : missions.filter((mission) => mission.completed === true).length;

    const allCompleted =
        data.allCompleted === true ||
        (totalMissions > 0 && completedCount === totalMissions);

    renderProgress(missions, completedCount, totalMissions);

    return { allCompleted, completedCount, totalMissions };
}

function renderProgress(missions, completedCount, totalMissions) {
    if (progressText) {
        progressText.textContent = `${completedCount} / ${totalMissions}`;
    }

    if (progressBar) {
        const percentage = totalMissions
            ? Math.min(100, (completedCount / totalMissions) * 100)
            : 0;
        progressBar.style.width = `${percentage}%`;
    }

    if (!missionProgress) return;

    missionProgress.replaceChildren();

    missions.forEach((mission) => {
        const item = document.createElement("div");
        const completed = mission.completed === true;

        item.className = `mission-item${completed ? " completed" : ""}`;
        item.textContent = mission.name || mission.code || "關卡";
        missionProgress.appendChild(item);
    });
}

async function loadLotteryStatus() {
    const query = new URLSearchParams({ lineUserId });

    const data = await fetchJson(
        `${API_BASE_URL}/api/lottery/status?${query.toString()}`,
        { headers: { Accept: "application/json" } }
    );

    renderWinnerHistory(data.winners || []);

    if (!data.hasEntry || !data.eligible) {
        lotteryCanDraw = false;
        setStatus("尚未取得抽獎資格", "目前查無有效抽獎資格。");
        disableDraw("尚未取得抽獎資格");
        return;
    }

    if (!data.canDraw) {
        lotteryCanDraw = false;
        setStatus("抽獎已完成", "您已完成抽獎，請查看下方中獎紀錄。");
        disableDraw("已完成抽獎");
        return;
    }

    lotteryCanDraw = true;
    setStatus("可以開始抽獎", "已確認抽獎資格，祝您好運！");
    enableDraw();
}

function setStatus(title, message) {
    if (statusTitle) statusTitle.textContent = title;
    if (statusMessage) statusMessage.textContent = message;
}

function enableDraw() {
    drawCard?.classList.remove("disabled");

    if (drawButton) {
        drawButton.disabled = false;
        drawButton.textContent = "🎰 開始抽獎";
    }
}

function disableDraw(label) {
    drawCard?.classList.add("disabled");

    if (drawButton) {
        drawButton.disabled = true;
        drawButton.textContent = label;
    }
}

async function drawLottery() {
    if (isDrawing || !lotteryCanDraw) return;

    isDrawing = true;
    if (drawButton) drawButton.disabled = true;

    try {
        await showDrawAnimation();

        const data = await fetchJson(`${API_BASE_URL}/api/lottery/draw`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ lineUserId, employeeNo })
        });

        showPrizeResult(data);
        await loadLotteryStatus();
    } catch (error) {
        console.error("[DRAW] 抽獎失敗", error);
        setStatus("抽獎失敗", error?.message || "抽獎過程發生錯誤。");

        // 重新向後端確認資格；不直接假設仍可抽。
        try {
            await loadLotteryStatus();
        } catch (statusError) {
            console.error("[LOTTERY STATUS] 更新失敗", statusError);
            lotteryCanDraw = false;
            disableDraw("無法確認抽獎狀態");
        }
    } finally {
        hideDrawAnimation();
        isDrawing = false;
    }
}

async function showDrawAnimation() {
    if (!drawingCard) return;

    drawCard?.classList.add("hidden");
    resultCard?.classList.add("hidden");
    drawingCard.classList.remove("hidden");

    for (const value of ["3", "2", "1", "GO!"]) {
        if (countdown) countdown.textContent = value;
        await delay(value === "GO!" ? 500 : 600);
    }
}

function hideDrawAnimation() {
    drawingCard?.classList.add("hidden");
    drawCard?.classList.remove("hidden");
}

function showPrizeResult(data) {
    const prize = data.prize;
    if (!prize) {
        throw new Error("抽獎成功，但伺服器沒有回傳獎項資料。");
    }

    const icons = {
        SMALL: "🎁",
        NORMAL: "🎊",
        GRAND: "🏆",
        BONUS: "👑"
    };

    if (resultIcon) {
        resultIcon.textContent =
            icons[String(prize.prizeType || "").toUpperCase()] || "🎉";
    }

    if (prizeName) prizeName.textContent = prize.name || "恭喜中獎";
    if (prizeDescription) {
        prizeDescription.textContent = prize.description || "恭喜您獲得獎項！";
    }
    if (resultMessage) {
        resultMessage.textContent = data.message || "恭喜您中獎！";
    }

    drawAgainButton?.classList.toggle("hidden", data.canDrawAgain !== true);
    resultCard?.classList.remove("hidden");
}

function renderWinnerHistory(winners) {
    if (!winnerList) return;

    winnerList.replaceChildren();

    if (!Array.isArray(winners) || winners.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-history";
        empty.textContent = "目前還沒有中獎紀錄";
        winnerList.appendChild(empty);
        return;
    }

    winners.forEach((winner) => {
        const type = String(winner.prizeType || "").toUpperCase();
        const icons = {
            SMALL: "🎁",
            NORMAL: "🎊",
            GRAND: "🏆",
            BONUS: "👑"
        };

        const item = document.createElement("div");
        item.className = "winner-item";

        const icon = document.createElement("div");
        icon.className = "winner-icon";
        icon.textContent = icons[type] || "🎁";

        const info = document.createElement("div");
        info.className = "winner-info";

        const name = document.createElement("div");
        name.className = "winner-name";
        name.textContent = winner.prizeName || "獎項";

        const time = document.createElement("div");
        time.className = "winner-time";
        time.textContent = formatDate(winner.wonAt);

        info.append(name, time);
        item.append(icon, info);
        winnerList.appendChild(item);
    });
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
        minute: "2-digit",
        second: "2-digit"
    });
}

function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}
