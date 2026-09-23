// =====================================================
// 旺年會抽獎
// lottery.js
// =====================================================

// =====================================================
// 設定
// =====================================================

const API_BASE_URL =
    "https://newsapi.winmen.com.tw";

const LIFF_ID =
    "2011685953-o8qvyQfR";


// =====================================================
// DOM
// =====================================================

const loading =
    document.getElementById("loading");

const errorCard =
    document.getElementById("error");

const errorMessage =
    document.getElementById("errorMessage");

const retryButton =
    document.getElementById("retryButton");

const lotteryArea =
    document.getElementById("lotteryArea");

const participantName =
    document.getElementById("participantName");

const employeeNoElement =
    document.getElementById("employeeNo");

const statusTitle =
    document.getElementById("statusTitle");

const statusMessage =
    document.getElementById("statusMessage");

const drawCard =
    document.getElementById("drawCard");

const drawButton =
    document.getElementById("drawButton");

const drawingCard =
    document.getElementById("drawingCard");

const countdown =
    document.getElementById("countdown");

const resultCard =
    document.getElementById("resultCard");

const resultIcon =
    document.getElementById("resultIcon");

const prizeName =
    document.getElementById("prizeName");

const prizeDescription =
    document.getElementById("prizeDescription");

const resultMessage =
    document.getElementById("resultMessage");

const drawAgainButton =
    document.getElementById("drawAgainButton");

const winnerList =
    document.getElementById("winnerList");


// =====================================================
// 使用者資料
// =====================================================

let lineUserId = "";

let employeeNo = "";

let currentProfile = null;


// =====================================================
// 抽獎狀態
// =====================================================

let isDrawing = false;


// =====================================================
// 啟動
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    startApp
);


// =====================================================
// Retry
// =====================================================

if (retryButton) {

    retryButton.addEventListener(
        "click",
        () => {
            window.location.reload();
        }
    );

}


// =====================================================
// 開始
// =====================================================

async function startApp() {

    try {

        showLoading(
            "正在初始化 LINE..."
        );


        // ---------------------------------------------
        // LIFF 初始化
        // ---------------------------------------------

        await liff.init({
            liffId: LIFF_ID
        });


        // ---------------------------------------------
        // LINE 登入
        // ---------------------------------------------

        if (!liff.isLoggedIn()) {

            showLoading(
                "正在開啟 LINE 登入..."
            );

            liff.login({
                redirectUri:
                    window.location.href
            });

            return;
        }


        // ---------------------------------------------
        // 取得 LINE Profile
        // ---------------------------------------------

        showLoading(
            "正在取得 LINE 使用者資料..."
        );

        currentProfile =
            await liff.getProfile();


        if (
            !currentProfile ||
            !currentProfile.userId
        ) {

            throw new Error(
                "無法取得 LINE 使用者資料"
            );

        }


        lineUserId =
            currentProfile.userId;


        // ---------------------------------------------
        // 取得工號
        // ---------------------------------------------

        employeeNo =
            localStorage.getItem(
                "wangnianhui_employee_no"
            ) || "";


        // ---------------------------------------------
        // 如果沒有工號
        // ---------------------------------------------

        if (!employeeNo) {

            throw new Error(
                "找不到您的員工工號，請先完成六關闖關與登記。"
            );

        }


        // ---------------------------------------------
        // 顯示基本資料
        // ---------------------------------------------

        if (participantName) {

            participantName.textContent =
                currentProfile.displayName || "-";

        }


        if (employeeNoElement) {

            employeeNoElement.textContent =
                `工號：${employeeNo}`;

        }


        // ---------------------------------------------
        // 顯示抽獎畫面
        // ---------------------------------------------

        showLotteryArea();


        // ---------------------------------------------
        // 先確認闖關資格
        // ---------------------------------------------

        await loadProgress();


        // ---------------------------------------------
        // 查詢抽獎狀態
        // ---------------------------------------------

        await loadLotteryStatus();

    }
    catch (error) {

        console.error(
            "[LOTTERY] 初始化失敗",
            error
        );

        showError(
            error.message ||
            "系統初始化失敗"
        );

    }

}


// =====================================================
// Loading
// =====================================================

function showLoading(
    message
) {

    if (loading) {

        loading.classList.remove(
            "hidden"
        );

        loading.innerHTML = `

            <div class="loading-spinner"></div>

            <p>
                ${escapeHtml(message)}
            </p>

        `;

    }

}


// =====================================================
// 顯示抽獎區
// =====================================================

function showLotteryArea() {

    if (loading) {

        loading.classList.add(
            "hidden"
        );

    }


    if (errorCard) {

        errorCard.classList.add(
            "hidden"
        );

    }


    if (lotteryArea) {

        lotteryArea.classList.remove(
            "hidden"
        );

    }

}


// =====================================================
// 錯誤
// =====================================================

function showError(
message
) {

    if (loading) {

        loading.classList.add(
            "hidden"
        );

    }


    if (lotteryArea) {

        lotteryArea.classList.add(
            "hidden"
        );

    }


    if (errorCard) {

        errorCard.classList.remove(
            "hidden"
        );

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }

}


// =====================================================
// 讀取 JSON
// =====================================================

async function readJsonResponse(
response
) {

    const text =
        await response.text();


    if (!text) {

        return {};

    }


    try {

        return JSON.parse(
            text
        );

    }
    catch (error) {

        console.error(
            "[API] 非 JSON 回應:",
            text
        );

        throw new Error(
            `伺服器回應格式錯誤（HTTP ${response.status}）`
        );

    }

}


// =====================================================
// 取得闖關進度
// =====================================================

async function loadProgress() {

    const url =
        `${API_BASE_URL}/api/game/progress` +

        `?lineUserId=${encodeURIComponent(
            lineUserId
        )}` +

        `&employeeNo=${encodeURIComponent(
            employeeNo
        )}`;


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    const data =
        await readJsonResponse(
            response
        );


    if (
        !response.ok ||
        data.success !== true
    ) {

        throw new Error(
            data.message ||
            "無法取得闖關進度"
        );

    }


    const missions =
        data.missions || [];


    const completedCount =
        missions.filter(
            mission =>
                mission.completed === true
        ).length;


    const totalMissions =
        data.totalMissions ||
        missions.length;


    const allCompleted =
        data.allCompleted === true ||
        (
            totalMissions > 0 &&
            completedCount === totalMissions
        );


    console.log(
        "[PROGRESS]",
        {
            completedCount,
            totalMissions,
            allCompleted
        }
    );


    // ---------------------------------------------
    // 尚未完成六關
    // ---------------------------------------------

    if (!allCompleted) {

        setStatus(
            "尚未取得抽獎資格",
            `目前完成 ${completedCount} / ${totalMissions} 關，請先完成全部闖關任務。`
        );


        disableDraw(
            "尚未完成六關"
        );


        return false;

    }


    // ---------------------------------------------
    // 六關完成
    // ---------------------------------------------

    setStatus(
        "已取得抽獎資格",
        "恭喜完成全部六關，可以開始抽獎！"
    );


    return true;

}


// =====================================================
// 抽獎狀態
// =====================================================

async function loadLotteryStatus() {

    const url =
        `${API_BASE_URL}/api/lottery/status` +

        `?lineUserId=${encodeURIComponent(
            lineUserId
        )}` +

        `&employeeNo=${encodeURIComponent(
            employeeNo
        )}`;


    const response =
        await fetch(
            url,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    const data =
        await readJsonResponse(
            response
        );


    if (
        !response.ok ||
        data.success !== true
    ) {

        throw new Error(
            data.message ||
            "無法取得抽獎狀態"
        );

    }


    console.log(
        "[LOTTERY STATUS]",
        data
    );


    renderLotteryStatus(
        data
    );


    renderWinnerHistory(
        data.winners || []
    );

}


// =====================================================
// 顯示抽獎狀態
// =====================================================

function renderLotteryStatus(
    data
) {

    // ---------------------------------------------
    // 沒有抽獎資格
    // ---------------------------------------------

    if (
        !data.hasEntry ||
        !data.eligible
    ) {

        setStatus(
            "尚未取得抽獎資格",
            "請先完成全部六個闖關任務。"
        );


        disableDraw(
            "尚未取得抽獎資格"
        );


        return;

    }


    // ---------------------------------------------
    // 已經抽過
    // ---------------------------------------------

    if (!data.canDraw) {

        setStatus(
            "抽獎已完成",
            "您已完成抽獎，請查看下方中獎紀錄。"
        );


        disableDraw(
            "已完成抽獎"
        );


        return;

    }


    // ---------------------------------------------
    // 可以抽獎
    // ---------------------------------------------

    setStatus(
        "可以開始抽獎",
        "恭喜您取得抽獎資格，祝您好運！"
    );


    enableDraw();

}


// =====================================================
// Status
// =====================================================

function setStatus(
title,
message
) {

    if (statusTitle) {

        statusTitle.textContent =
            title;

    }


    if (statusMessage) {

        statusMessage.textContent =
            message;

    }

}


// =====================================================
// 啟用抽獎
// =====================================================

function enableDraw() {

    if (drawCard) {

        drawCard.classList.remove(
            "disabled"
        );

    }


    if (drawButton) {

        drawButton.disabled =
            false;

        drawButton.textContent =
            "🎰 開始抽獎";

    }

}


// =====================================================
// 停用抽獎
// =====================================================

function disableDraw(
text
) {

    if (drawCard) {

        drawCard.classList.add(
            "disabled"
        );

    }


    if (drawButton) {

        drawButton.disabled =
            true;

        drawButton.textContent =
            text;

    }

}


// =====================================================
// 抽獎按鈕
// =====================================================

if (drawButton) {

    drawButton.addEventListener(
        "click",
        drawLottery
    );

}


// =====================================================
// 開始抽獎
// =====================================================

async function drawLottery() {

    if (isDrawing) {

        return;

    }


    isDrawing = true;


    if (drawButton) {

        drawButton.disabled =
            true;

    }


    try {

        // -----------------------------------------
        // 顯示抽獎動畫
        // -----------------------------------------

        await showDrawAnimation();


        // -----------------------------------------
        // 呼叫後端
        // -----------------------------------------

        const response =
            await fetch(
                `${API_BASE_URL}/api/lottery/draw`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            lineUserId:
                                lineUserId,

                            employeeNo:
                                employeeNo

                        })
                }
            );


        const data =
            await readJsonResponse(
                response
            );


        // -----------------------------------------
        // API 錯誤
        // -----------------------------------------

        if (
            !response.ok ||
            data.success !== true
        ) {

            throw new Error(
                data.message ||
                "抽獎失敗"
            );

        }


        // -----------------------------------------
        // 顯示結果
        // -----------------------------------------

        showPrizeResult(
            data
        );


        // -----------------------------------------
        // 更新狀態
        // -----------------------------------------

        await loadLotteryStatus();

    }
    catch (error) {

        console.error(
            "[DRAW] 抽獎失敗",
            error
        );


        setStatus(
            "抽獎失敗",
            error.message ||
            "抽獎過程發生錯誤"
        );


        enableDraw();

    }
    finally {

        hideDrawAnimation();

        isDrawing =
            false;

    }

}


// =====================================================
// 抽獎動畫
// =====================================================

async function showDrawAnimation() {

    if (!drawingCard) {

        return;

    }


    if (drawCard) {

        drawCard.classList.add(
            "hidden"
        );

    }


    if (resultCard) {

        resultCard.classList.add(
            "hidden"
        );

    }


    drawingCard.classList.remove(
        "hidden"
    );


    if (countdown) {

        countdown.textContent =
            "3";

    }


    await delay(
        600
    );


    if (countdown) {

        countdown.textContent =
            "2";

    }


    await delay(
        600
    );


    if (countdown) {

        countdown.textContent =
            "1";

    }


    await delay(
        600
    );


    if (countdown) {

        countdown.textContent =
            "GO!";

    }


    await delay(
        500
    );

}


// =====================================================
// 隱藏動畫
// =====================================================

function hideDrawAnimation() {

    if (drawingCard) {

        drawingCard.classList.add(
            "hidden"
        );

    }

}


// =====================================================
// 顯示中獎結果
// =====================================================

function showPrizeResult(
data
) {

    const prize =
        data.prize;


    if (!prize) {

        throw new Error(
            "抽獎成功，但沒有取得獎項資料。"
        );

    }


    const type =
        (
            prize.prizeType ||
            ""
        ).toUpperCase();


    // ---------------------------------------------
    // 圖示
    // ---------------------------------------------

    switch (type) {

        case "SMALL":

            if (resultIcon) {

                resultIcon.textContent =
                    "🎁";

            }

            break;


        case "NORMAL":

            if (resultIcon) {

                resultIcon.textContent =
                    "🎊";

            }

            break;


        case "GRAND":

            if (resultIcon) {

                resultIcon.textContent =
                    "🏆";

            }

            break;


        case "BONUS":

            if (resultIcon) {

                resultIcon.textContent =
                    "👑";

            }

            break;


        default:

            if (resultIcon) {

                resultIcon.textContent =
                    "🎉";

            }

            break;

    }


    if (prizeName) {

        prizeName.textContent =
            prize.name ||
            "恭喜中獎";

    }


    if (prizeDescription) {

        prizeDescription.textContent =
            prize.description ||
            "恭喜您獲得獎項！";

    }


    if (resultMessage) {

        resultMessage.textContent =
            data.message ||
            "恭喜您中獎！";

    }


    // ---------------------------------------------
    // 是否還能再抽
    // ---------------------------------------------

    if (
        data.canDrawAgain === true
    ) {

        if (drawAgainButton) {

            drawAgainButton.classList.remove(
                "hidden"
            );

        }

    }
    else {

        if (drawAgainButton) {

            drawAgainButton.classList.add(
                "hidden"
            );

        }

    }


    // ---------------------------------------------
    // 顯示結果
    // ---------------------------------------------

    if (resultCard) {

        resultCard.classList.remove(
            "hidden"
        );

    }

}


// =====================================================
// 再抽一次
// =====================================================

if (drawAgainButton) {

    drawAgainButton.addEventListener(
        "click",
        async () => {

            if (isDrawing) {

                return;

            }


            if (resultCard) {

                resultCard.classList.add(
                    "hidden"
                );

            }


            await delay(
                200
            );


            await drawLottery();

        }
    );

}


// =====================================================
// 中獎紀錄
// =====================================================

function renderWinnerHistory(
winners
) {

    if (!winnerList) {

        return;

    }


    if (
        !winners ||
        winners.length === 0
    ) {

        winnerList.innerHTML = `

            <div class="empty-history">

                目前還沒有中獎紀錄

            </div>

        `;

        return;

    }


    winnerList.innerHTML = "";


    winners.forEach(
        winner => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "winner-item";


            const type =
                (
                    winner.prizeType ||
                    ""
                ).toUpperCase();


            let icon =
                "🎁";


            if (type === "NORMAL") {

                icon =
                    "🎊";

            }


            if (type === "GRAND") {

                icon =
                    "🏆";

            }


            if (type === "BONUS") {

                icon =
                    "👑";

            }


            item.innerHTML = `

                <div class="winner-icon">

                    ${icon}

                </div>

                <div class="winner-info">

                    <div class="winner-name">

                        ${escapeHtml(
                            winner.prizeName ||
                            "獎項"
                        )}

                    </div>

                    <div class="winner-time">

                        ${escapeHtml(
                            formatDate(
                                winner.wonAt
                            )
                        )}

                    </div>

                </div>

            `;


            winnerList.appendChild(
                item
            );

        }
    );

}


// =====================================================
// 日期
// =====================================================

function formatDate(
value
) {

    if (!value) {

        return "";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleString(
        "zh-TW",
        {
            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit"
        }
    );

}


// =====================================================
// Delay
// =====================================================

function delay(
milliseconds
) {

    return new Promise(
        resolve => {

            setTimeout(
                resolve,
                milliseconds
            );

        }
    );

}


// =====================================================
// HTML Escape
// =====================================================

function escapeHtml(
value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}
