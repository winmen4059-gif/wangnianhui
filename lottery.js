// =====================================================
// 旺年會闖關
// Frontend
// =====================================================


// =====================================================
// 設定
// =====================================================

// 正式環境請改成你的 ASP.NET Core API 網址
const API_BASE_URL = "https://newsapi.winmen.com.tw";

// LINE LIFF ID
const LIFF_ID = "2011685953-o8qvyQfR";


// =====================================================
// DOM
// =====================================================

const loadingScreen =
    document.getElementById("loadingScreen");

const loadingText =
    document.getElementById("loadingText");

const loginScreen =
    document.getElementById("loginScreen");

const mainScreen =
    document.getElementById("mainScreen");

const employeeNoInput =
    document.getElementById("employeeNoInput");

const loginButton =
    document.getElementById("loginButton");

const loginMessage =
    document.getElementById("loginMessage");

const displayName =
    document.getElementById("displayName");

const missionProgress =
    document.getElementById("missionProgress");

const progressText =
    document.getElementById("progressText");

const progressBar =
    document.getElementById("progressBar");

const lotteryArea =
    document.getElementById("lotteryArea");

const winnerHistory =
    document.getElementById("winnerHistory");

const drawOverlay =
    document.getElementById("drawOverlay");

const drawNumber =
    document.getElementById("drawNumber");

const drawAnimation =
    document.getElementById("drawAnimation");

const resultOverlay =
    document.getElementById("resultOverlay");

const resultIcon =
    document.getElementById("resultIcon");

const resultTitle =
    document.getElementById("resultTitle");

const resultPrize =
    document.getElementById("resultPrize");

const resultDescription =
    document.getElementById("resultDescription");

const drawAgainButton =
    document.getElementById("drawAgainButton");

const closeResultButton =
    document.getElementById("closeResultButton");


// =====================================================
// 使用者資料
// =====================================================

let lineUserId = "";

let employeeNo = "";

let currentProfile = null;


// =====================================================
// 啟動
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    startApp
);


// =====================================================
// Start
// =====================================================

async function startApp() {

    try {

        setLoading(
            "正在初始化 LINE..."
        );


        // ---------------------------------------------
        // 初始化 LIFF
        // ---------------------------------------------

        await liff.init({
            liffId: LIFF_ID
        });


        // ---------------------------------------------
        // LINE 登入
        // ---------------------------------------------

        if (!liff.isLoggedIn()) {

            setLoading(
                "正在開啟 LINE 登入..."
            );

            liff.login();

            return;
        }


        // ---------------------------------------------
        // 取得 LINE Profile
        // ---------------------------------------------

        setLoading(
            "正在取得 LINE 使用者資料..."
        );

        currentProfile =
            await liff.getProfile();

        lineUserId =
            currentProfile.userId;


        // ---------------------------------------------
        // 檢查是否已經記住工號
        // ---------------------------------------------

        const savedEmployeeNo =
            localStorage.getItem(
                "wangnianhui_employee_no"
            );


        if (savedEmployeeNo) {

            employeeNo =
                savedEmployeeNo;


            await registerOrLogin();

            return;
        }


        // ---------------------------------------------
        // 顯示工號輸入
        // ---------------------------------------------

        showLogin();

    }
    catch (error) {

        console.error(
            "初始化失敗",
            error
        );

        showLogin();

        loginMessage.textContent =
            "系統初始化失敗，請重新整理頁面。";
    }
}


// =====================================================
// Loading
// =====================================================

function setLoading(message) {

    loadingText.textContent =
        message;
}


// =====================================================
// 顯示登入
// =====================================================

function showLogin() {

    loadingScreen.classList.add(
        "hidden"
    );

    loginScreen.classList.remove(
        "hidden"
    );

    mainScreen.classList.add(
        "hidden"
    );
}


// =====================================================
// 顯示主畫面
// =====================================================

function showMain() {

    loadingScreen.classList.add(
        "hidden"
    );

    loginScreen.classList.add(
        "hidden"
    );

    mainScreen.classList.remove(
        "hidden"
    );
}


// =====================================================
// Login button
// =====================================================

loginButton.addEventListener(
    "click",
    async () => {

        employeeNo =
            employeeNoInput.value.trim();

        if (!employeeNo) {

            loginMessage.textContent =
                "請輸入員工工號";

            return;
        }


        loginButton.disabled = true;

        loginMessage.textContent =
            "登入中...";


        try {

            await registerOrLogin();

        }
        catch (error) {

            console.error(
                error
            );

            loginMessage.textContent =
                error.message ||
                "登入失敗";

            loginButton.disabled = false;
        }
    }
);


// =====================================================
// LINE + 工號登入
// =====================================================

async function registerOrLogin() {

    // ---------------------------------------------
    // 取得 LINE ID Token
    // ---------------------------------------------

    const idToken =
        liff.getIDToken();


    if (!idToken) {

        throw new Error(
            "無法取得 LINE ID Token，請重新開啟 LINE。"
        );
    }


    // ---------------------------------------------
    // 呼叫後端 register
    // ---------------------------------------------

    const response =
        await fetch(
            `${API_BASE_URL}/api/auth/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    idToken,
                    employeeNo
                })
            }
        );


    const data =
        await response.json();


    if (!response.ok ||
        !data.success) {

        throw new Error(
            data.message ||
            "登入失敗"
        );
    }


    // ---------------------------------------------
    // 儲存工號
    // ---------------------------------------------

    localStorage.setItem(
        "wangnianhui_employee_no",
        employeeNo
    );


    // ---------------------------------------------
    // 顯示主畫面
    // ---------------------------------------------

    showMain();


    displayName.textContent =
        `${data.displayName || ""}　工號：${employeeNo}`;


    // ---------------------------------------------
    // 載入遊戲
    // ---------------------------------------------

    await loadGame();

}


// =====================================================
// 載入遊戲
// =====================================================

async function loadGame() {

    try {

        setMainLoading();


        // ---------------------------------------------
        // 查詢進度
        // ---------------------------------------------

        await loadProgress();


        // ---------------------------------------------
        // 查詢抽獎狀態
        // ---------------------------------------------

        await loadLotteryStatus();

    }
    catch (error) {

        console.error(
            error
        );

        lotteryArea.innerHTML =
            `
            <div class="lottery-card">
                <div class="lottery-icon">⚠️</div>
                <div class="lottery-title">
                    系統錯誤
                </div>
                <div class="lottery-description">
                    ${escapeHtml(error.message)}
                </div>
            </div>
            `;
    }
}


// =====================================================
// 主畫面 Loading
// =====================================================

function setMainLoading() {

    lotteryArea.innerHTML =
        `
        <div class="lottery-card">
            <div class="lottery-icon">
                🎁
            </div>

            <div class="lottery-title">
                載入中...
            </div>

            <div class="lottery-description">
                正在取得您的抽獎資料
            </div>
        </div>
        `;
}


// =====================================================
// 取得六關進度
// =====================================================

async function loadProgress() {

    const url =
        `${API_BASE_URL}/api/game/progress` +
        `?lineUserId=${encodeURIComponent(lineUserId)}` +
        `&employeeNo=${encodeURIComponent(employeeNo)}`;


    const response =
        await fetch(url);


    const data =
        await response.json();


    if (!response.ok ||
        !data.success) {

        throw new Error(
            data.message ||
            "無法取得闖關進度"
        );
    }


    renderMissions(
        data.missions
    );


    progressText.textContent =
        `${data.completedCount} / ${data.totalMissions}`;


    const percent =
        data.totalMissions > 0
            ? (
                data.completedCount /
                data.totalMissions
            ) * 100
            : 0;


    progressBar.style.width =
        `${percent}%`;
}


// =====================================================
// Render Missions
// =====================================================

function renderMissions(
    missions
) {

    missionProgress.innerHTML = "";


    missions.forEach(
        mission => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "mission-card" +
                (
                    mission.completed
                        ? " completed"
                        : ""
                );


            card.innerHTML =
                `
                <div class="mission-code">
                    ${escapeHtml(
                        mission.code
                    )}
                </div>

                <div class="mission-name">
                    ${escapeHtml(
                        mission.name
                    )}
                </div>

                <div class="mission-status">
                    ${
                        mission.completed
                            ? "✓ 已完成"
                            : "尚未完成"
                    }
                </div>
                `;


            missionProgress.appendChild(
                card
            );
        }
    );
}


// =====================================================
// Lottery Status
// =====================================================

async function loadLotteryStatus() {

    const url =
        `${API_BASE_URL}/api/lottery/status` +
        `?lineUserId=${encodeURIComponent(lineUserId)}` +
        `&employeeNo=${encodeURIComponent(employeeNo)}`;


    const response =
        await fetch(url);


    const data =
        await response.json();


    if (!response.ok ||
        !data.success) {

        throw new Error(
            data.message ||
            "無法取得抽獎狀態"
        );
    }


    renderLottery(
        data
    );


    renderWinnerHistory(
        data.winners || []
    );
}


// =====================================================
// Render Lottery
// =====================================================

function renderLottery(
    data
) {

    // ---------------------------------------------
    // 沒有資格
    // ---------------------------------------------

    if (!data.hasEntry ||
        !data.eligible) {

        lotteryArea.innerHTML =
            `
            <div class="lottery-card">

                <div class="lottery-icon">
                    🎁
                </div>

                <div class="lottery-title">
                    尚未取得抽獎資格
                </div>

                <div class="lottery-description">
                    請先完成六個闖關任務，
                    完成後即可取得抽獎資格。
                </div>

            </div>
            `;

        return;
    }


    // ---------------------------------------------
    // 已經不能抽
    // ---------------------------------------------

    if (!data.canDraw) {

        lotteryArea.innerHTML =
            `
            <div class="lottery-card">

                <div class="lottery-icon">
                    🏆
                </div>

                <div class="lottery-title">
                    抽獎已完成
                </div>

                <div class="lottery-description">
                    感謝您的參與！
                    <br>
                    請至下方查看您的中獎紀錄。
                </div>

            </div>
            `;

        return;
    }


    // ---------------------------------------------
    // 可以抽
    // ---------------------------------------------

    lotteryArea.innerHTML =
        `
        <div class="lottery-card">

            <div class="lottery-icon">
                🎁
            </div>

            <div class="lottery-title">
                幸運抽獎
            </div>

            <div class="lottery-description">
                恭喜您取得抽獎資格！
                <br>
                準備好迎接您的幸運獎項了嗎？
            </div>

            <button
                id="startDrawButton"
                class="primary-button">

                🎉 開始抽獎

            </button>

        </div>
        `;


    const button =
        document.getElementById(
            "startDrawButton"
        );


    button.addEventListener(
        "click",
        drawLottery
    );
}


// =====================================================
// Draw Lottery
// =====================================================

async function drawLottery() {

    showDrawAnimation();


    try {

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

                        lineUserId,

                        employeeNo

                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            !data.success) {

            hideDrawAnimation();

            throw new Error(
                data.message ||
                "抽獎失敗"
            );
        }


        // -----------------------------------------
        // 等動畫
        // -----------------------------------------

        await delay(
            1800
        );


        hideDrawAnimation();


        // -----------------------------------------
        // 顯示結果
        // -----------------------------------------

        showPrizeResult(
            data
        );


        // -----------------------------------------
        // 更新資料
        // -----------------------------------------

        await loadLotteryStatus();

    }
    catch (error) {

        hideDrawAnimation();


        alert(
            error.message ||
            "抽獎失敗"
        );


        await loadLotteryStatus();
    }
}


// =====================================================
// Draw Animation
// =====================================================

async function showDrawAnimation() {

    drawOverlay.classList.remove(
        "hidden"
    );


    drawNumber.textContent =
        "3";


    drawAnimation.textContent =
        "🎁";


    await delay(500);


    drawNumber.textContent =
        "2";

    drawAnimation.textContent =
        "✨";


    await delay(500);


    drawNumber.textContent =
        "1";

    drawAnimation.textContent =
        "🎉";


    await delay(500);


    drawNumber.textContent =
        "GO!";
}


// =====================================================
// Hide Draw Animation
// =====================================================

function hideDrawAnimation() {

    drawOverlay.classList.add(
        "hidden"
    );
}


// =====================================================
// Show Prize
// =====================================================

function showPrizeResult(
    data
) {

    const prize =
        data.prize;


    const type =
        (
            prize.prizeType ||
            ""
        ).toUpperCase();


    // ---------------------------------------------
    // Icon
    // ---------------------------------------------

    switch (type) {

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
    }


    resultTitle.textContent =
        "恭喜中獎！";


    resultPrize.textContent =
        prize.name;


    resultDescription.textContent =
        prize.description ||
        data.message ||
        "恭喜您！";


    // ---------------------------------------------
    // 再抽一次
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


    resultOverlay.classList.remove(
        "hidden"
    );
}


// =====================================================
// 再抽一次
// =====================================================

drawAgainButton.addEventListener(
    "click",
    async () => {

        resultOverlay.classList.add(
            "hidden"
        );

        await delay(250);

        await drawLottery();
    }
);


// =====================================================
// 關閉結果
// =====================================================

closeResultButton.addEventListener(
    "click",
    () => {

        resultOverlay.classList.add(
            "hidden"
        );
    }
);


// =====================================================
// Winner History
// =====================================================

function renderWinnerHistory(
    winners
) {

    if (!winners ||
        winners.length === 0) {

        winnerHistory.innerHTML =
            `
            <div class="no-winner">
                目前還沒有中獎紀錄
            </div>
            `;

        return;
    }


    winnerHistory.innerHTML = "";


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
                icon = "🎊";
            }

            if (type === "GRAND") {
                icon = "🏆";
            }

            if (type === "BONUS") {
                icon = "👑";
            }


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
                        ${formatDate(
                            winner.wonAt
                        )}
                    </div>

                </div>
                `;


            winnerHistory.appendChild(
                item
            );
        }
    );
}


// =====================================================
// Date
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
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}


// =====================================================
// Escape HTML
// =====================================================

function escapeHtml(
    value
) {

    if (value === null ||
        value === undefined) {

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
