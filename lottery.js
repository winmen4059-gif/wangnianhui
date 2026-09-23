// =====================================================
// 旺年會抽獎
// =====================================================


// =====================================================
// API 設定
// =====================================================

// !!! 請改成你的 ASP.NET Core API 網址 !!!

const API_BASE_URL =
    "https://newsapi.winmen.com.tw";


// =====================================================
// LINE LIFF
// =====================================================

const LIFF_ID =
    "2011685953-o8qvyQfR";


// =====================================================
// DOM
// =====================================================

const loading =
    document.getElementById("loading");

const error =
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
// 全域資料
// =====================================================

let lineUserId = "";

let employeeNo = "";

let lotteryStatus = null;


// =====================================================
// 頁面開始
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        retryButton.addEventListener(
            "click",
            () => {
                location.reload();
            }
        );


        drawButton.addEventListener(
            "click",
            startDraw
        );


        drawAgainButton.addEventListener(
            "click",
            startDraw
        );


        try {

            await initialize();

        }
        catch (error) {

            console.error(
                "初始化失敗",
                error
            );

            showError(
                error.message ||
                "初始化失敗"
            );
        }

    }
);


// =====================================================
// 初始化
// =====================================================

async function initialize() {

    // ---------------------------------------------
    // 初始化 LINE LIFF
    // ---------------------------------------------

    await liff.init({
        liffId: LIFF_ID
    });


    // ---------------------------------------------
    // 確認登入
    // ---------------------------------------------

    if (!liff.isLoggedIn()) {

        liff.login();

        return;
    }


    // ---------------------------------------------
    // 取得 LINE Profile
    // ---------------------------------------------

    const profile =
        await liff.getProfile();


    lineUserId =
        profile.userId;


    // ---------------------------------------------
    // 取得工號
    // ---------------------------------------------

    employeeNo =
        getEmployeeNo();


    if (!employeeNo) {

        throw new Error(
            "找不到員工工號，請先完成登入與工號登記。"
        );
    }


    // ---------------------------------------------
    // 查詢抽獎狀態
    // ---------------------------------------------

    await loadLotteryStatus();
}


// =====================================================
// 從 URL / localStorage 取得工號
// =====================================================

function getEmployeeNo() {

    // ---------------------------------------------
    // 1. URL
    // ---------------------------------------------

    const params =
        new URLSearchParams(
            window.location.search
        );


    const urlEmployeeNo =
        params.get("employeeNo");


    if (urlEmployeeNo) {

        localStorage.setItem(
            "employeeNo",
            urlEmployeeNo
        );

        return urlEmployeeNo.trim();
    }


    // ---------------------------------------------
    // 2. localStorage
    // ---------------------------------------------

    const storedEmployeeNo =
        localStorage.getItem(
            "employeeNo"
        );


    if (storedEmployeeNo) {

        return storedEmployeeNo.trim();
    }


    return "";
}


// =====================================================
// 查詢抽獎狀態
// =====================================================

async function loadLotteryStatus() {

    const url =
        `${API_BASE_URL}/api/lottery/status` +
        `?lineUserId=${encodeURIComponent(lineUserId)}` +
        `&employeeNo=${encodeURIComponent(employeeNo)}`;


    const response =
        await fetch(url);


    const data =
        await readJson(response);


    if (!response.ok) {

        throw new Error(
            data.message ||
            "取得抽獎狀態失敗"
        );
    }


    lotteryStatus =
        data;


    // ---------------------------------------------
    // 顯示頁面
    // ---------------------------------------------

    loading.classList.add(
        "hidden"
    );

    lotteryArea.classList.remove(
        "hidden"
    );


    // ---------------------------------------------
    // 參加者
    // ---------------------------------------------

    participantName.textContent =
        data.participantName ||
        "參加者";

    employeeNoElement.textContent =
        `工號：${employeeNo}`;


    // ---------------------------------------------
    // 更新狀態
    // ---------------------------------------------

    updateLotteryStatus(data);


    // ---------------------------------------------
    // 顯示中獎紀錄
    // ---------------------------------------------

    renderWinners(
        data.winners || []
    );
}


// =====================================================
// 更新抽獎狀態
// =====================================================

function updateLotteryStatus(data) {

    if (!data.hasEntry) {

        statusTitle.textContent =
            "尚未取得抽獎資格";

        statusMessage.textContent =
            "請先完成六個闖關任務。";

        drawCard.classList.add(
            "hidden"
        );

        return;
    }


    if (!data.eligible) {

        statusTitle.textContent =
            "目前沒有抽獎資格";

        statusMessage.textContent =
            "請確認是否已完成全部六關。";

        drawCard.classList.add(
            "hidden"
        );

        return;
    }


    if (!data.canDraw) {

        statusTitle.textContent =
            "抽獎已完成";

        statusMessage.textContent =
            "您已經中獎，無法再次抽獎。";

        drawCard.classList.add(
            "hidden"
        );

        return;
    }


    // ---------------------------------------------
    // 可以抽獎
    // ---------------------------------------------

    statusTitle.textContent =
        "🎉 您已取得抽獎資格！";

    statusMessage.textContent =
        "準備好就可以開始抽獎。";


    drawCard.classList.remove(
        "hidden"
    );
}


// =====================================================
// 開始抽獎
// =====================================================

async function startDraw() {

    // ---------------------------------------------
    // 防止連續點擊
    // ---------------------------------------------

    drawButton.disabled = true;

    drawAgainButton.disabled = true;


    // ---------------------------------------------
    // 顯示抽獎動畫
    // ---------------------------------------------

    drawCard.classList.add(
        "hidden"
    );

    resultCard.classList.add(
        "hidden"
    );

    drawingCard.classList.remove(
        "hidden"
    );


    try {

        await countdownAnimation();


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
                            "application/json"
                    },

                    body: JSON.stringify({

                        lineUserId:
                            lineUserId,

                        employeeNo:
                            employeeNo

                    })
                }
            );


        const data =
            await readJson(response);


        if (!response.ok) {

            throw new Error(
                data.message ||
                "抽獎失敗"
            );
        }


        // -----------------------------------------
        // 顯示結果
        // -----------------------------------------

        showDrawResult(data);


        // -----------------------------------------
        // 更新狀態
        // -----------------------------------------

        await loadLotteryStatus();


    }
    catch (error) {

        console.error(
            "抽獎錯誤",
            error
        );


        drawingCard.classList.add(
            "hidden"
        );


        showError(
            error.message ||
            "抽獎失敗"
        );

    }
    finally {

        drawButton.disabled = false;

        drawAgainButton.disabled = false;
    }
}


// =====================================================
// 倒數動畫
// =====================================================

function countdownAnimation() {

    return new Promise(
        resolve => {

            let number = 3;

            countdown.textContent =
                number;


            const timer =
                setInterval(
                    () => {

                        number--;


                        if (number <= 0) {

                            clearInterval(
                                timer
                            );

                            countdown.textContent =
                                "🎉";

                            setTimeout(
                                resolve,
                                400
                            );

                            return;
                        }


                        countdown.textContent =
                            number;

                    },
                    700
                );
        }
    );
}


// =====================================================
// 顯示抽獎結果
// =====================================================

function showDrawResult(data) {

    drawingCard.classList.add(
        "hidden"
    );


    resultCard.classList.remove(
        "hidden"
    );


    const prize =
        data.prize;


    if (!prize) {

        prizeName.textContent =
            "恭喜中獎！";

        prizeDescription.textContent =
            "";

        resultMessage.textContent =
            data.message ||
            "";

        return;
    }


    // ---------------------------------------------
    // 獎項
    // ---------------------------------------------

    prizeName.textContent =
        prize.name ||
        "獎項";


    prizeDescription.textContent =
        prize.description ||
        "";


    resultMessage.textContent =
        data.message ||
        "恭喜您中獎！";


    // ---------------------------------------------
    // 不同獎項圖示
    // ---------------------------------------------

    switch (
        String(
            prize.prizeType || ""
        ).toUpperCase()
    ) {

        case "SMALL":

            resultIcon.textContent =
                "🎁";

            break;


        case "NORMAL":

            resultIcon.textContent =
                "🎊";

            break;


        case "GRAND":

            resultIcon.textContent =
                "🏆";

            break;


        case "BONUS":

            resultIcon.textContent =
                "👑";

            break;


        default:

            resultIcon.textContent =
                "🎉";

            break;
    }


    // ---------------------------------------------
    // 是否可以再抽
    // ---------------------------------------------

    if (data.canDrawAgain) {

        drawAgainButton.classList.remove(
            "hidden"
        );

    }
    else {

        drawAgainButton.classList.add(
            "hidden"
        );
    }
}


// =====================================================
// 中獎紀錄
// =====================================================

function renderWinners(winners) {

    if (!winners ||
        winners.length === 0) {

        winnerList.innerHTML =
            `
            <div class="empty-history">
                目前還沒有中獎紀錄
            </div>
            `;

        return;
    }


    winnerList.innerHTML =
        "";


    winners.forEach(
        winner => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "winner-item";


            const icon =
                getPrizeIcon(
                    winner.prizeType
                );


            const time =
                formatDate(
                    winner.wonAt
                );


            item.innerHTML =
                `
                <div class="winner-icon">
                    ${icon}
                </div>

                <div class="winner-info">

                    <div class="winner-name">
                        ${escapeHtml(
                            winner.prizeName
                        )}
                    </div>

                    <div class="winner-time">
                        ${time}
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
// 獎項圖示
// =====================================================

function getPrizeIcon(
    prizeType
) {

    switch (
        String(
            prizeType || ""
        ).toUpperCase()
    ) {

        case "SMALL":
            return "🎁";

        case "NORMAL":
            return "🎊";

        case "GRAND":
            return "🏆";

        case "BONUS":
            return "👑";

        default:
            return "🎉";
    }
}


// =====================================================
// 日期格式
// =====================================================

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (Number.isNaN(
        date.getTime()
    )) {

        return value;
    }


    return date.toLocaleString(
        "zh-TW",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// =====================================================
// JSON Response
// =====================================================

async function readJson(
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
    catch {

        return {
            message: text
        };
    }
}


// =====================================================
// Error
// =====================================================

function showError(
    message
) {

    loading.classList.add(
        "hidden"
    );

    lotteryArea.classList.add(
        "hidden
