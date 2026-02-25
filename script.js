const canvas = document.getElementById('tetris-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-board');
const nextCtx = nextCanvas.getContext('2d');

// モバイル用のNextキャンバス（3つ）
const nextMobileCanvases = [
    document.getElementById('next-board-mobile-1'),
    document.getElementById('next-board-mobile-2'),
    document.getElementById('next-board-mobile-3')
];
const nextMobileCtxs = nextMobileCanvases.map(c => c ? c.getContext('2d') : null);

// 1マスのサイズ（px）
const BLOCK_SIZE = 24;
// 盤面のサイズ（行、列）
const ROWS = 23;
const COLS = 11;

// キャンバスのサイズを調整してスケールを設定
ctx.scale(BLOCK_SIZE, BLOCK_SIZE);
nextCtx.scale(BLOCK_SIZE, BLOCK_SIZE);

// 色の定義（サイバーな雰囲気）
const COLORS = [
    null,
    '#0ea5e9', // I (Sky 500)
    '#3b82f6', // J (Blue 500)
    '#f97316', // L (Orange 500)
    '#eab308', // O (Yellow 500)
    '#22c55e', // S (Green 500)
    '#a855f7', // T (Purple 500)
    '#ef4444', // Z (Red 500)
    '#6b7280', // 8: お邪魔ブロック（グレー）
    '#e879f9'  // 9: 爆弾ブロック（ピンクパープル）
];

// テトリミノ（ブロック）の形状定義
const SHAPES = [
    [],
    // I
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    // J
    [[0, 2, 0], [0, 2, 0], [2, 2, 0]],
    // L
    [[0, 3, 0], [0, 3, 0], [0, 3, 3]],
    // O
    [[4, 4], [4, 4]],
    // S
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    // T
    [[0, 0, 0], [6, 6, 6], [0, 6, 0]],
    // Z
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

// --- サウンドエフェクト (Web Audio API) ---
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let soundEnabled = false;

// ユーザー操作時にAudioContextを初期化・有効化
function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    soundEnabled = true;
}

// 最初のタッチ・クリックで音声を有効化
document.addEventListener('pointerdown', ensureAudio, { once: true });
document.addEventListener('keydown', ensureAudio, { once: true });

function playSound(type) {
    // 毎回確実にAudioContextを初期化・有効化
    ensureAudio();
    if (!audioCtx) return;
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'move') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'rotate') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'clear') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'drop') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'gameover') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } else if (type === 'lock') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
            gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'bonus_clear') {
            // ボーナス消去特殊効果音（上昇アルペジオ）
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.08);
            osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.16);
            osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.24);
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.4);
        } else if (type === 'tetris') {
            // テトリス達成ファンファーレ
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, audioCtx.currentTime);
            osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.06);
            osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.12);
            osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.18);
            osc.frequency.setValueAtTime(1319, audioCtx.currentTime + 0.24);
            osc.frequency.setValueAtTime(1568, audioCtx.currentTime + 0.30);
            gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        } else if (type === 'tspin') {
            // T-Spin効果音（重厚な回転音）
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.setValueAtTime(400, audioCtx.currentTime + 0.1);
            osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.35);
        } else if (type === 'perfect') {
            // パーフェクトクリア効果音（華やかなファンファーレ）
            osc.type = 'square';
            osc.frequency.setValueAtTime(523, audioCtx.currentTime);
            osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.08);
            osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.16);
            osc.frequency.setValueAtTime(1319, audioCtx.currentTime + 0.24);
            osc.frequency.setValueAtTime(1568, audioCtx.currentTime + 0.32);
            osc.frequency.setValueAtTime(2093, audioCtx.currentTime + 0.40);
            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.6);
        } else if (type === 'hold') {
            // ホールド効果音
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, audioCtx.currentTime);
            osc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (type === 'explosion') {
            // 爆弾ブロック爆発音
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'garbage') {
            // お邪魔ブロック追加音
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(80, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
        }
    } catch (e) {
        // 音声エラーは無視（ゲームを止めない）
    }
}

// --- BGM (HTML5 Audio による MP3 再生) ---
const bgmAudio = new Audio('bgm.mp3');
bgmAudio.loop = true;
bgmAudio.volume = 0.15;
let bgmPlaying = false;
let bgmWasPlaying = false; // ポーズ前の状態を保持

// BGM開始
function startBgm() {
    ensureAudio();
    bgmAudio.currentTime = 0;
    bgmAudio.play().catch(() => { });
    bgmPlaying = true;
}

// BGM停止
function stopBgm() {
    bgmAudio.pause();
    bgmPlaying = false;
}

// BGMポーズ（位置を保持して一時停止）
function pauseBgm() {
    if (bgmPlaying) {
        bgmWasPlaying = true;
        bgmAudio.pause();
        bgmPlaying = false;
    }
}

// BGM再開（ポーズ位置から再生）
function resumeBgm() {
    if (bgmWasPlaying) {
        bgmWasPlaying = false;
        bgmAudio.play().catch(() => { });
        bgmPlaying = true;
    }
}

// BGMトグル
function toggleBgm() {
    if (bgmPlaying) {
        stopBgm();
        bgmWasPlaying = false;
    } else {
        startBgm();
        bgmWasPlaying = false;
    }
    updateBgmButton();
}

// BGMボタン表示更新
function updateBgmButton() {
    const btn = document.getElementById('btn-bgm');
    if (btn) btn.textContent = bgmPlaying ? '🔊' : '🔇';
}
let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// 現在操作しているブロック
let currentPiece = null;
// Nextブロックのキュー（3つ先まで）
let nextQueue = [];

// ポーズとゲームオーバー状態
let isPaused = false;
let isGameOver = false;
let isWaitingStart = true; // スタート待ち

// ホールドシステム
let holdPiece = null;
let holdUsed = false; // 1ターンに1回のみ

// T-Spin検出用
let lastMoveWasRotation = false;

// Back-to-Backフラグ
let backToBack = false;

// お邪魔ブロックカウンター
let garbageCounter = 0;
const GARBAGE_START_LEVEL = 10;
const GARBAGE_CHANCE = 0.15; // 15%

let score = 0;
let level = 1;
const rowScore = [0, 10, 30, 50, 80];

// --- ハイスコア管理（名前付き） ---
const HIGH_SCORES_KEY = 'tetris_high_scores_v3'; // v3: スコア体系変更に伴いリセット
const MAX_HIGH_SCORES = 5;

// ブロック固定エフェクト用
let lockFlashCells = []; // [{x, y, alpha}]
let lockFlashTimer = 0;
const LOCK_FLASH_DURATION = 200; // ミリ秒

// --- バッテリー最適化: ダーティフラグとFPS制御 ---
let needsRedraw = true; // 描画が必要な場合のみtrue
const isMobile = window.matchMedia('(max-width: 800px)').matches;

function markDirty() { needsRedraw = true; }

// エフェクトがアクティブかどうか
function hasActiveEffects() {
    return lockFlashTimer > 0 || bonusFlashTimer > 0 || tetrisFlashTimer > 0 ||
        specialFlashTimer > 0 || explosionFlashTimer > 0;
}

function loadHighScores() {
    const data = localStorage.getItem(HIGH_SCORES_KEY);
    if (data) {
        const parsed = JSON.parse(data);
        // 有効なエントリのみ返す（score > 0）、scoreを数値に変換して降順ソート
        const filtered = parsed
            .filter(e => e && Number(e.score) > 0)
            .map(e => ({ ...e, score: Number(e.score) }));
        filtered.sort((a, b) => b.score - a.score);
        return filtered;
    }
    // 旧データの移行を試みる
    const oldData = localStorage.getItem('tetris_high_scores');
    if (oldData) {
        const oldScores = JSON.parse(oldData);
        const migrated = oldScores.filter(s => Number(s) > 0).map(s => ({ name: '---', score: Number(s), id: Date.now() + Math.random() }));
        migrated.sort((a, b) => b.score - a.score);
        return migrated;
    }
    return [];
}

function saveHighScores(scores) {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
}

// スコアがランキング入りするかチェック（上位5位以内なら名前入力可）
function isHighScore(newScore) {
    if (newScore <= 0) return false;
    const scores = loadHighScores();
    // 空きスロットがあればランクイン
    if (scores.length < MAX_HIGH_SCORES) return true;
    // 最下位を上回っていればランクイン
    return newScore > scores[scores.length - 1].score;
}

// ハイスコアを保存（名前付き、レベルも保存）
function saveHighScore(newScore, name) {
    const scores = loadHighScores();
    const entry = {
        name: name || '---',
        score: Number(newScore),
        level: level, // レベルも保存
        id: Date.now()
    };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    scores.splice(MAX_HIGH_SCORES);
    saveHighScores(scores);
    return entry.id;
}

// ゲームオーバー画面にハイスコア一覧を表示
let isWaitingForName = false; // 名前入力待ちフラグ

function showGameOverScreen() {
    const overlay = document.getElementById('game-over-overlay');
    const scoreDisplay = document.getElementById('go-score-display');
    const listEl = document.getElementById('go-highscore-list');
    const nameArea = document.getElementById('go-name-input-area');
    const restartMsg = document.getElementById('go-restart-msg');

    // スコアをローカル変数にキャプチャ（リスタートされても値が変わらない）
    const finalScore = score;
    scoreDisplay.textContent = 'YOUR SCORE: ' + finalScore;

    if (isHighScore(finalScore)) {
        // ランキング入り — 名前入力を表示
        isWaitingForName = true;
        nameArea.classList.remove('hidden');
        restartMsg.classList.add('hidden');
        listEl.innerHTML = '';

        // 「NEW HIGH SCORE!」ラベルは1位更新時のみ表示
        const existingScores = loadHighScores();
        const goLabel = document.getElementById('go-new-high-label');
        if (goLabel) {
            const isNewTop = existingScores.length === 0 || finalScore > existingScores[0].score;
            goLabel.classList.toggle('hidden', !isNewTop);
        }

        const input = document.getElementById('go-name-input');
        const okBtn = document.getElementById('go-name-ok');
        input.value = '';
        setTimeout(() => input.focus(), 100);

        // 名前確定処理（一度だけ実行）
        let nameConfirmed = false;
        const confirmName = () => {
            if (nameConfirmed) return;
            nameConfirmed = true;
            const playerName = input.value.trim() || 'AAA';
            const savedId = saveHighScore(finalScore, playerName);
            nameArea.classList.add('hidden');
            restartMsg.classList.remove('hidden');
            isWaitingForName = false;
            renderHighScoreTable(listEl, savedId);
        };

        // 既存のリスナーを除去してから追加（pointerdown + click 両方対応）
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        newOkBtn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            confirmName();
        });
        newOkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            confirmName();
        });

        // Enterキーでも確定
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmName();
            }
        };
    } else {
        isWaitingForName = false;
        nameArea.classList.add('hidden');
        restartMsg.classList.remove('hidden');
        // 空きスロットがあれば名前なしで自動保存
        if (finalScore > 0) {
            const scores = loadHighScores();
            if (scores.length < MAX_HIGH_SCORES) {
                saveHighScore(finalScore, '---');
            }
        }
        renderHighScoreTable(listEl, null);
    }

    overlay.classList.remove('hidden');
}

// ハイスコアテーブルをHTML描画（一意IDでハイライト）
function renderHighScoreTable(container, highlightId) {
    const scores = loadHighScores();
    let html = '<p style="color: rgba(255,255,255,0.55); font-size: 11px; letter-spacing: 2px; margin: 4px 0;">RANKING</p>';
    if (scores.length === 0) {
        html += '<p style="color: rgba(255,255,255,0.3); font-size: 11px;">No records yet</p>';
        container.innerHTML = html;
        return;
    }
    html += '<table><tr><th>#</th><th>NAME</th><th>SCORE</th><th>LV</th></tr>';
    scores.forEach((entry, i) => {
        const cls = (highlightId && entry.id === highlightId) ? ' class="highlight"' : '';
        const lv = entry.level || '?';
        html += `<tr${cls}><td>${i + 1}</td><td>${entry.name}</td><td>${entry.score}</td><td>${lv}</td></tr>`;
    });
    html += '</table>';
    container.innerHTML = html;
}

// 落下のタイマー用変数
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 1000;

// 落下猶予用のタイマー（ロックダウン時間）
let lockDelayCounter = 0;
const LOCK_DELAY = 500; // 0.5秒でロック

// ブロックを作成する関数（3%の確率でボーナスブロック、Oブロックは除外）
function createPiece(type) {
    const matrix = SHAPES[type].map(row => [...row]);
    const piece = {
        matrix: matrix,
        pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
        type: type,
        isBonus: type !== 4 && Math.random() < 0.03 // Oブロック（黄色正方形）にはボーナス非適用
    };

    // 爆弾ブロック: 2%の確率でピースの1マスを爆弾(値=9)に変換
    if (Math.random() < 0.02) {
        const filledCells = [];
        matrix.forEach((row, y) => {
            row.forEach((val, x) => {
                if (val !== 0) filledCells.push({ x, y });
            });
        });
        if (filledCells.length > 0) {
            const cell = filledCells[Math.floor(Math.random() * filledCells.length)];
            matrix[cell.y][cell.x] = 9;
            piece.hasBomb = true;
        }
    }

    return piece;
}

// ホールド機能: 現在のブロックをストック/交換
function holdCurrentPiece() {
    if (holdUsed) return; // 1ターン1回制限
    holdUsed = true;
    playSound('hold');

    if (holdPiece === null) {
        // 初回ホールド: 現在のピースをストックし、Nextから取得
        holdPiece = currentPiece.type;
        currentPiece = popNextPiece();
    } else {
        // 交換: ホールド中のピースと入れ替え
        const tempType = holdPiece;
        holdPiece = currentPiece.type;
        currentPiece = createPiece(tempType);
    }
    lockDelayCounter = 0;
    dropCounter = 0;
    markDirty();
}

// ホールドピースの描画
function drawHoldPiece() {
    // PC用HOLDキャンバス
    const holdCanvas = document.getElementById('hold-board');
    const holdCtx = holdCanvas ? holdCanvas.getContext('2d') : null;
    if (holdCtx && holdCanvas) {
        holdCtx.fillStyle = '#0f172a';
        holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
        if (holdPiece !== null) {
            const matrix = SHAPES[holdPiece].map(row => [...row]);
            const piece = { matrix, isBonus: false };
            drawNextPiece(piece, holdCanvas, holdCtx);
            // ホールド使用済みの場合は暗くする
            if (holdUsed) {
                holdCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
            }
        }
    }
    // モバイル用HOLDキャンバス
    const holdMobileCanvas = document.getElementById('hold-board-mobile');
    const holdMobileCtx = holdMobileCanvas ? holdMobileCanvas.getContext('2d') : null;
    if (holdMobileCtx && holdMobileCanvas) {
        holdMobileCtx.fillStyle = '#0f172a';
        holdMobileCtx.fillRect(0, 0, holdMobileCanvas.width, holdMobileCanvas.height);
        if (holdPiece !== null) {
            const matrix = SHAPES[holdPiece].map(row => [...row]);
            const piece = { matrix, isBonus: false };
            drawNextPiece(piece, holdMobileCanvas, holdMobileCtx);
            if (holdUsed) {
                holdMobileCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                holdMobileCtx.fillRect(0, 0, holdMobileCanvas.width, holdMobileCanvas.height);
            }
        }
    }
}

// T-Spin検出: Tブロックが回転直後にロックされた場合、4隅のうち3つ以上が埋まっているかチェック
function detectTSpin(piece) {
    if (piece.type !== 6) return false; // Tブロックのみ
    if (!lastMoveWasRotation) return false; // 最後の操作が回転でなければ無効

    // Tブロックの中心位置を取得
    const cx = piece.pos.x + 1;
    const cy = piece.pos.y + 1;

    // 4隅をチェック
    const corners = [
        { x: cx - 1, y: cy - 1 },
        { x: cx + 1, y: cy - 1 },
        { x: cx - 1, y: cy + 1 },
        { x: cx + 1, y: cy + 1 }
    ];

    let filledCorners = 0;
    corners.forEach(c => {
        if (c.y < 0 || c.y >= ROWS || c.x < 0 || c.x >= COLS || board[c.y][c.x] !== 0) {
            filledCorners++;
        }
    });

    return filledCorners >= 3;
}

// お邪魔ブロック: 盤面下部に1行グレーブロックを追加（1箇所だけ穴）
function addGarbageLine() {
    // 盤面の最上行を削除し、下に新行を追加
    board.shift();
    const garbageRow = Array(COLS).fill(8); // 8 = お邪魔ブロック（グレー）
    const holePos = Math.floor(Math.random() * COLS);
    garbageRow[holePos] = 0; // 穴
    board.push(garbageRow);
    playSound('garbage');
}

// Nextキューを初期化（3つ先まで）
function fillNextQueue() {
    while (nextQueue.length < 3) {
        nextQueue.push(createPiece(Math.floor(Math.random() * 7) + 1));
    }
}

// Nextキューから次のブロックを取得
function popNextPiece() {
    const piece = nextQueue.shift();
    fillNextQueue();
    return piece;
}

// 衝突判定
function collide(board, piece) {
    const [m, o] = [piece.matrix, piece.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0) {
                if (!board[y + o.y] ||
                    board[y + o.y][x + o.x] === undefined ||
                    board[y + o.y][x + o.x] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ブロックを盤面に固定する
function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + piece.pos.y][x + piece.pos.x] = value;
            }
        });
    });
}

// ブロック固定エフェクトを発動
function triggerLockFlash(piece) {
    lockFlashCells = [];
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                lockFlashCells.push({
                    x: piece.pos.x + x,
                    y: piece.pos.y + y,
                    alpha: 1.0
                });
            }
        });
    });
    lockFlashTimer = LOCK_FLASH_DURATION;
    playSound('lock');
}

// ブロックを盤面に固定し、次のブロックへ移行する処理
function lockPiece() {
    const wasBonus = currentPiece.isBonus; // ボーナスピースかどうかを記録
    const wasTSpin = detectTSpin(currentPiece); // T-Spin検出
    const hasBomb = currentPiece.hasBomb; // 爆弾ブロック検出
    triggerLockFlash(currentPiece);
    merge(board, currentPiece);
    arenaSweep(wasBonus ? 10 : 1, wasTSpin, hasBomb); // ボーナスなら10倍スコア、T-Spinと爆弾フラグも渡す

    // お邪魔ブロック: Lv10以降、15%の確率で1行追加
    if (level >= GARBAGE_START_LEVEL && Math.random() < GARBAGE_CHANCE) {
        addGarbageLine();
    }

    // ホールド使用制限をリセット
    holdUsed = false;
    lastMoveWasRotation = false;

    currentPiece = popNextPiece();

    if (collide(board, currentPiece)) {
        isGameOver = true;
        playSound('gameover');
        pauseBgm(); // ゲームオーバー時にBGMを停止
        showGameOverScreen();
    }

    lockDelayCounter = 0;
    dropCounter = 0;
}

// ブロックを下に落とす
function dropPiece() {
    currentPiece.pos.y++;
    if (collide(board, currentPiece)) {
        currentPiece.pos.y--;
    } else {
        dropCounter = 0;
    }
}

// 連続テトリスコンボカウンター
let tetrisCombo = 0;

// 行の消去判定とスコア計算（multiplier: ボーナスブロック時に10倍）
function arenaSweep(multiplier = 1, isTSpin = false, hasBomb = false) {
    // 爆弾ブロック: 消去行に爆弾(値=9)が含まれていた場合、上下1行も消去対象に追加
    let rowsToRemove = new Set();
    for (let y = board.length - 1; y >= 0; --y) {
        let isFull = true;
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) { isFull = false; break; }
        }
        if (isFull) {
            rowsToRemove.add(y);
            // 爆弾チェック: 消去される行に値9のセルがあるか
            for (let x = 0; x < board[y].length; ++x) {
                if (board[y][x] === 9) {
                    // 上下の行も消去対象に追加
                    if (y - 1 >= 0) rowsToRemove.add(y - 1);
                    if (y + 1 < board.length) rowsToRemove.add(y + 1);
                    playSound('explosion');
                    triggerExplosionFlash();
                }
            }
        }
    }

    // 消去対象の行を実際に消去（spliceを先にすべて行い、最後にまとめてunshift）
    let rowCount = 0;
    if (rowsToRemove.size > 0) {
        const sortedRows = Array.from(rowsToRemove).sort((a, b) => b - a);
        // 下から順にsplice（上の行のインデックスは変わらない）
        sortedRows.forEach(y => {
            board.splice(y, 1);
        });
        rowCount = sortedRows.length;
        // 削除した分の空行をまとめて上に追加
        for (let i = 0; i < rowCount; i++) {
            board.unshift(Array(COLS).fill(0));
        }
    }

    // T-Spinの「難しい」消去かどうか判定
    const isDifficult = (rowCount >= 4) || isTSpin;

    if (rowCount > 0) {
        // T-Spinボーナス
        let tSpinMultiplier = 1;
        if (isTSpin) {
            tSpinMultiplier = 3; // T-Spinは3倍スコア
            playSound('tspin');
            triggerSpecialFlash('T-SPIN!', '#a855f7');
        }

        // Back-to-Backボーナス
        let b2bMultiplier = 1;
        if (isDifficult && backToBack) {
            b2bMultiplier = 1.5; // B2B: 1.5倍ボーナス
            triggerSpecialFlash('B2B!', '#fbbf24');
        }
        // B2Bフラグ更新
        if (isDifficult) {
            backToBack = true;
        } else {
            backToBack = false;
        }

        if (rowCount >= 4) {
            // テトリス達成！コンボ加算
            tetrisCombo++;
            const comboMultiplier = 1 + (tetrisCombo - 1) * 0.5;
            const gained = Math.floor(rowScore[Math.min(rowCount, 4)] * level * multiplier * comboMultiplier * tSpinMultiplier * b2bMultiplier);
            playSound('tetris');
            triggerTetrisFlash(gained, tetrisCombo);
            if (multiplier > 1) {
                playSound('bonus_clear');
                triggerBonusFlash(gained);
            }
            score += gained;
        } else {
            // テトリス以外の消去 → コンボリセット
            tetrisCombo = 0;
            const gained = Math.floor(rowScore[rowCount] * level * multiplier * tSpinMultiplier * b2bMultiplier);
            if (multiplier > 1) {
                playSound('bonus_clear');
                triggerBonusFlash(gained);
            } else {
                playSound('clear');
            }
            score += gained;
        }

        // パーフェクトクリア: 消去後に盤面が完全に空かチェック
        const isPerfectClear = board.every(row => row.every(cell => cell === 0));
        if (isPerfectClear) {
            score += 500;
            playSound('perfect');
            triggerSpecialFlash('PERFECT CLEAR!', '#22d3ee');
        }

        level = Math.floor(score / 1000) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateScore();
    } else {
        // ライン消去なし → コンボリセット
        tetrisCombo = 0;
    }
}

// 特殊フラッシュエフェクト（T-Spin、B2B、パーフェクトクリア共通）
let specialFlashTimer = 0;
let specialFlashText = '';
let specialFlashColor = '#fff';
const SPECIAL_FLASH_DURATION = 1000;

function triggerSpecialFlash(text, color) {
    specialFlashTimer = SPECIAL_FLASH_DURATION;
    specialFlashText = text;
    specialFlashColor = color;
}

// 爆発エフェクト
let explosionFlashTimer = 0;
const EXPLOSION_FLASH_DURATION = 500;

function triggerExplosionFlash() {
    explosionFlashTimer = EXPLOSION_FLASH_DURATION;
}

// ボーナス消去時の画面フラッシュエフェクト
let bonusFlashTimer = 0;
let bonusFlashScore = 0; // ボーナス加算スコア
const BONUS_FLASH_DURATION = 600;

function triggerBonusFlash(gained) {
    bonusFlashTimer = BONUS_FLASH_DURATION;
    bonusFlashScore = gained;
}

// テトリス達成時のフラッシュエフェクト
let tetrisFlashTimer = 0;
let tetrisFlashScore = 0;
let tetrisFlashCombo = 0;
const TETRIS_FLASH_DURATION = 800;

function triggerTetrisFlash(gained, combo) {
    tetrisFlashTimer = TETRIS_FLASH_DURATION;
    tetrisFlashScore = gained;
    tetrisFlashCombo = combo;
}

// 画面にスコアとレベルを反映
function updateScore() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    const scoreMobile = document.getElementById('score-mobile');
    const levelMobile = document.getElementById('level-mobile');
    if (scoreMobile) scoreMobile.innerText = score;
    if (levelMobile) levelMobile.innerText = level;
}

// ブロックを横に動かす
function movePiece(dir) {
    currentPiece.pos.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.pos.x -= dir;
    } else {
        playSound('move');
        lockDelayCounter = 0;
        lastMoveWasRotation = false; // 移動したらT-Spin無効
        markDirty();
    }
}

// 行列を回転させる関数
function rotateMatrix(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

// ブロックを回転させる
function rotatePiece(dir) {
    const pos = currentPiece.pos.x;
    let offset = 1;
    rotateMatrix(currentPiece.matrix, dir);

    while (collide(board, currentPiece)) {
        currentPiece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));

        if (offset > currentPiece.matrix[0].length) {
            rotateMatrix(currentPiece.matrix, -dir);
            currentPiece.pos.x = pos;
            return;
        }
    }
    playSound('rotate');
    lockDelayCounter = 0;
    lastMoveWasRotation = true; // T-Spin検出用: 最後の操作が回転
    markDirty();
}

// 次の落下予測位置（ゴースト）を計算
function getGhostPos() {
    const ghost = { matrix: currentPiece.matrix, pos: { x: currentPiece.pos.x, y: currentPiece.pos.y } };
    while (!collide(board, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    return ghost.pos;
}

// 描画関数：マス目を描く（リキッドグラス質感）
function drawMatrix(matrix, offset, targetCtx, isGhost = false, isBonus = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const bx = x + offset.x;
                const by = y + offset.y;
                if (isGhost) {
                    targetCtx.fillStyle = COLORS[value] + '30';
                    targetCtx.fillRect(bx + 0.05, by + 0.05, 0.9, 0.9);
                } else {
                    // ベースカラー
                    targetCtx.fillStyle = COLORS[value];
                    targetCtx.fillRect(bx + 0.05, by + 0.05, 0.9, 0.9);

                    // リキッドグラス: 内側のハイライト（光の屈折）
                    const grad = targetCtx.createLinearGradient(bx, by, bx + 0.9, by + 0.9);
                    grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
                    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.08)');
                    grad.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
                    targetCtx.fillStyle = grad;
                    targetCtx.fillRect(bx + 0.05, by + 0.05, 0.9, 0.9);

                    // 上部のスペキュラーハイライト（光の反射線）
                    targetCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    targetCtx.fillRect(bx + 0.15, by + 0.1, 0.6, 0.15);

                    // 左側の光のエッジ
                    targetCtx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                    targetCtx.fillRect(bx + 0.05, by + 0.1, 0.12, 0.7);

                    // 境界線（ガラスのエッジ）
                    targetCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                    targetCtx.lineWidth = 0.04;
                    targetCtx.strokeRect(bx + 0.07, by + 0.07, 0.86, 0.86);

                    // ボーナスブロックの七色レインボーエフェクト
                    if (isBonus) {
                        const t = Date.now() / 200;
                        const hue = (t * 60 + (bx + by) * 40) % 360;
                        const pulse = 0.45 + 0.25 * Math.sin(t * 3);
                        // レインボーグロー
                        targetCtx.fillStyle = `hsla(${hue}, 100%, 65%, ${pulse})`;
                        targetCtx.fillRect(bx + 0.05, by + 0.05, 0.9, 0.9);
                        // 白いスパークル
                        const sparkle = 0.3 + 0.5 * Math.sin(t * 5 + bx * 2);
                        targetCtx.fillStyle = `rgba(255, 255, 255, ${sparkle})`;
                        targetCtx.fillRect(bx + 0.3, by + 0.2, 0.12, 0.12);
                        targetCtx.fillRect(bx + 0.6, by + 0.6, 0.08, 0.08);
                        // レインボー境界線
                        targetCtx.strokeStyle = `hsla(${(hue + 180) % 360}, 100%, 70%, ${pulse + 0.2})`;
                        targetCtx.lineWidth = 0.08;
                        targetCtx.strokeRect(bx + 0.05, by + 0.05, 0.9, 0.9);
                    }
                }
            }
        });
    });
}

// Nextブロックを小さなキャンバスに描画するヘルパー
function drawNextPiece(piece, canvasEl, ctxEl) {
    if (!ctxEl || !canvasEl) return;
    const w = canvasEl.width;
    const h = canvasEl.height;
    ctxEl.fillStyle = '#0f172a';
    ctxEl.fillRect(0, 0, w, h);

    const matrix = piece.matrix;
    const cols = matrix[0].length;
    const rows = matrix.length;
    const blockSize = Math.min(w / cols, h / rows) * 0.8;
    const offsetX = (w - cols * blockSize) / 2;
    const offsetY = (h - rows * blockSize) / 2;

    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const px = offsetX + x * blockSize + 1;
                const py = offsetY + y * blockSize + 1;
                const bs = blockSize - 2;
                ctxEl.fillStyle = COLORS[value];
                ctxEl.fillRect(px, py, bs, bs);

                // ボーナスブロックのレインボーエフェクト
                if (piece.isBonus) {
                    const t = Date.now() / 200;
                    const hue = (t * 60 + (x + y) * 50) % 360;
                    const pulse = 0.45 + 0.25 * Math.sin(t * 3);
                    ctxEl.fillStyle = `hsla(${hue}, 100%, 65%, ${pulse})`;
                    ctxEl.fillRect(px, py, bs, bs);
                    // 白いスパークル
                    ctxEl.fillStyle = `rgba(255, 255, 255, ${0.3 + 0.4 * Math.sin(t * 5)})`;
                    ctxEl.fillRect(px + bs * 0.25, py + bs * 0.15, bs * 0.15, bs * 0.15);
                    // レインボー境界線
                    ctxEl.strokeStyle = `hsla(${(hue + 180) % 360}, 100%, 70%, ${pulse + 0.2})`;
                    ctxEl.lineWidth = 2;
                    ctxEl.strokeRect(px, py, bs, bs);
                }
            }
        });
    });
}

// 画面全体の描画更新
function draw() {
    if (isWaitingStart) return; // スタート待ちなら描画しない
    if (!needsRedraw) return; // ダーティフラグが立っていなければスキップ
    needsRedraw = false;
    // 背景クリア
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 固定されたブロックを描画
    drawMatrix(board, { x: 0, y: 0 }, ctx);

    // ブロック固定エフェクト描画
    if (lockFlashCells.length > 0) {
        const alpha = lockFlashTimer / LOCK_FLASH_DURATION;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
        lockFlashCells.forEach(cell => {
            ctx.fillRect(cell.x + 0.05, cell.y + 0.05, 0.9, 0.9);
        });
    }

    // ボーナス消去時の画面フラッシュエフェクト
    if (bonusFlashTimer > 0) {
        const progress = bonusFlashTimer / BONUS_FLASH_DURATION;
        const alpha = progress * 0.35;
        const hue = (Date.now() / 5) % 360;
        // レインボーフラッシュ
        ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${alpha})`;
        ctx.fillRect(0, 0, COLS, ROWS);
        // スコア表示
        ctx.save();
        ctx.scale(1 / BLOCK_SIZE, 1 / BLOCK_SIZE);
        ctx.textAlign = 'center';
        // +スコア表示
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.fillText(`+${bonusFlashScore}`, (COLS * BLOCK_SIZE) / 2, (ROWS * BLOCK_SIZE) / 2 - 20);
        // ×10 BONUS! ラベル
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = `hsla(${hue}, 100%, 80%, ${progress})`;
        ctx.fillText('×10 BONUS!', (COLS * BLOCK_SIZE) / 2, (ROWS * BLOCK_SIZE) / 2 + 20);
        ctx.restore();
    }

    // テトリス達成時のフラッシュエフェクト
    if (tetrisFlashTimer > 0) {
        const progress = tetrisFlashTimer / TETRIS_FLASH_DURATION;
        const alpha = progress * 0.4;
        // シアン色のフラッシュ
        ctx.fillStyle = `rgba(0, 220, 255, ${alpha})`;
        ctx.fillRect(0, 0, COLS, ROWS);
        // テキスト表示
        ctx.save();
        ctx.scale(1 / BLOCK_SIZE, 1 / BLOCK_SIZE);
        ctx.textAlign = 'center';
        // TETRIS! テキスト（スケールアニメーション）
        const scale = 1 + (1 - progress) * 0.5;
        const cx = (COLS * BLOCK_SIZE) / 2;
        const cy = (ROWS * BLOCK_SIZE) / 2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.font = 'bold 52px sans-serif';
        ctx.fillStyle = `rgba(0, 255, 255, ${progress})`;
        ctx.strokeStyle = `rgba(255, 255, 255, ${progress * 0.8})`;
        ctx.lineWidth = 2;
        ctx.strokeText('TETRIS!', 0, -10);
        ctx.fillText('TETRIS!', 0, -10);
        // +スコア
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.fillText(`+${tetrisFlashScore}`, 0, 30);
        // コンボ表示（2コンボ以上で表示）
        if (tetrisFlashCombo >= 2) {
            ctx.font = 'bold 22px sans-serif';
            ctx.fillStyle = `rgba(255, 200, 0, ${progress})`;
            ctx.fillText(`COMBO ×${tetrisFlashCombo}!`, 0, 60);
        }
        ctx.restore();
    }

    // 特殊フラッシュエフェクト（T-Spin、B2B、パーフェクトクリア）
    if (specialFlashTimer > 0) {
        const progress = specialFlashTimer / SPECIAL_FLASH_DURATION;
        ctx.save();
        ctx.scale(1 / BLOCK_SIZE, 1 / BLOCK_SIZE);
        ctx.textAlign = 'center';
        const cx = (COLS * BLOCK_SIZE) / 2;
        const cy = (ROWS * BLOCK_SIZE) / 2;
        const scale = 1 + (1 - progress) * 0.3;
        ctx.translate(cx, cy - 80);
        ctx.scale(scale, scale);
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = specialFlashColor.replace(')', `, ${progress})`.replace('rgb', 'rgba'));
        ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.strokeStyle = specialFlashColor;
        ctx.lineWidth = 3;
        ctx.strokeText(specialFlashText, 0, 0);
        ctx.fillText(specialFlashText, 0, 0);
        ctx.restore();
    }

    // 爆発エフェクト
    if (explosionFlashTimer > 0) {
        const progress = explosionFlashTimer / EXPLOSION_FLASH_DURATION;
        const alpha = progress * 0.4;
        ctx.fillStyle = `rgba(255, 120, 0, ${alpha})`;
        ctx.fillRect(0, 0, COLS, ROWS);
    }

    // ゴーストブロックを描画
    const ghostPos = getGhostPos();
    drawMatrix(currentPiece.matrix, ghostPos, ctx, true);

    // 落下中のブロックを描画
    drawMatrix(currentPiece.matrix, currentPiece.pos, ctx, false, currentPiece.isBonus);

    // --- HOLDピースの描画 ---
    drawHoldPiece();

    if (isMobile) {
        // モバイル: モバイル用Nextのみ描画（PC用キャンバスは非表示）
        for (let i = 0; i < 3; i++) {
            if (nextQueue[i] && nextMobileCtxs[i]) {
                drawNextPiece(nextQueue[i], nextMobileCanvases[i], nextMobileCtxs[i]);
            }
        }
    } else {
        // PC: PC用Nextのみ描画
        nextCtx.fillStyle = '#0f172a';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        if (nextQueue.length > 0) {
            const nw = nextQueue[0].matrix[0].length;
            const nh = nextQueue[0].matrix.length;
            const noff = {
                x: (120 / BLOCK_SIZE - nw) / 2,
                y: (120 / BLOCK_SIZE - nh) / 2
            };
            drawMatrix(nextQueue[0].matrix, noff, nextCtx, false, nextQueue[0].isBonus);
        }
    }
}

// ゲームループ
const TARGET_FPS = 20; // エフェクト時は20fps
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const FRAME_INTERVAL_LOW = 1000 / 12; // 通常時は12fps（バッテリー節約）
let animFrameId = null;

function update(time = 0) {
    if (isWaitingStart || isPaused || isGameOver) {
        // スタート待ち/ポーズ/ゲームオーバー中はループ停止（バッテリー節約）
        lastTime = 0;
        animFrameId = null;
        return;
    }

    animFrameId = requestAnimationFrame(update);

    // FPS制限: 前フレームから十分な時間が経過していなければスキップ
    if (lastTime === 0) {
        lastTime = time;
        return;
    }
    const deltaTime = time - lastTime;
    // エフェクトアクティブ時は20fps、通常時は12fpsに制限（バッテリー節約）
    const currentFrameInterval = hasActiveEffects() ? FRAME_INTERVAL : FRAME_INTERVAL_LOW;
    if (deltaTime < currentFrameInterval) return;
    lastTime = time;

    // 固定エフェクトのタイマー更新
    if (lockFlashTimer > 0) {
        lockFlashTimer -= deltaTime;
        if (lockFlashTimer <= 0) {
            lockFlashTimer = 0;
            lockFlashCells = [];
        }
    }

    // ボーナスフラッシュエフェクトのタイマー更新
    if (bonusFlashTimer > 0) {
        bonusFlashTimer -= deltaTime;
        if (bonusFlashTimer <= 0) bonusFlashTimer = 0;
    }

    // テトリスフラッシュエフェクトのタイマー更新
    if (tetrisFlashTimer > 0) {
        tetrisFlashTimer -= deltaTime;
        if (tetrisFlashTimer <= 0) tetrisFlashTimer = 0;
    }

    // 特殊フラッシュエフェクトのタイマー更新
    if (specialFlashTimer > 0) {
        specialFlashTimer -= deltaTime;
        if (specialFlashTimer <= 0) specialFlashTimer = 0;
    }

    // 爆発フラッシュエフェクトのタイマー更新
    if (explosionFlashTimer > 0) {
        explosionFlashTimer -= deltaTime;
        if (explosionFlashTimer <= 0) explosionFlashTimer = 0;
    }

    // 地面に接しているかチェック
    currentPiece.pos.y++;
    const isTouching = collide(board, currentPiece);
    currentPiece.pos.y--;

    if (isTouching) {
        lockDelayCounter += deltaTime;
        if (lockDelayCounter >= LOCK_DELAY) {
            lockPiece();
        }
    } else {
        lockDelayCounter = 0;
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            dropPiece();
        }
    }

    // エフェクト中またはロジック更新があったので描画が必要
    markDirty();
    draw();
}

// ゲームループを再開する関数（ポーズ解除・リスタート時に使用）
function resumeGameLoop() {
    if (!animFrameId && !isPaused && !isGameOver && !isWaitingStart) {
        lastTime = 0;
        animFrameId = requestAnimationFrame(update);
    }
}

// --- Page Visibility API（タブ切替でゲームを自動停止） ---
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // タブが非表示 → ループ停止・BGM一時停止
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        pauseBgm();
    } else {
        // タブが再表示 → ループ再開・BGM再開
        resumeGameLoop();
        resumeBgm();
    }
});

// --- ゲームリスタート ---
function restartGame() {
    board.forEach(row => row.fill(0));
    score = 0;
    level = 1;
    updateScore();
    dropInterval = 1000;
    isGameOver = false;
    isWaitingStart = false;
    lockFlashCells = [];
    lockFlashTimer = 0;
    // 新機能のリセット
    holdPiece = null;
    holdUsed = false;
    lastMoveWasRotation = false;
    backToBack = false;
    tetrisCombo = 0;
    specialFlashTimer = 0;
    explosionFlashTimer = 0;
    bonusFlashTimer = 0;
    tetrisFlashTimer = 0;
    document.getElementById('game-over-overlay').classList.add('hidden');
    nextQueue = [];
    fillNextQueue();
    currentPiece = popNextPiece();
    // BGMが以前再生中だった場合は再開
    resumeBgm();
    // ゲームループを再開
    resumeGameLoop();
}

// キーボード操作の受付
document.addEventListener('keydown', event => {
    // スタート待ち中はSpaceまたは任意のキーでスタート
    if (isWaitingStart) {
        if (event.keyCode === 32) {
            event.preventDefault();
            startGame();
        }
        return;
    }

    if ([32, 37, 38, 39, 40, 72, 80].includes(event.keyCode)) {
        event.preventDefault();
    }

    // Pキーでポーズ
    if (event.keyCode === 80) {
        if (isGameOver) return;
        isPaused = !isPaused;
        const overlay = document.getElementById('pause-overlay');
        if (isPaused) {
            overlay.classList.remove('hidden');
            pauseBgm();
        } else {
            overlay.classList.add('hidden');
            resumeBgm();
            resumeGameLoop();
        }
        return;
    }

    if (isPaused) return;

    // ゲームオーバー時のリスタート（名前入力中はブロック）
    if (isGameOver) {
        if (event.keyCode === 32 && !isWaitingForName) restartGame();
        return;
    }

    switch (event.keyCode) {
        case 37: movePiece(-1); break;
        case 39: movePiece(1); break;
        case 40: dropPiece(); break;
        case 72: holdCurrentPiece(); break; // Hキーでホールド
        case 38: rotatePiece(1); break;
        case 32: {
            // 地面に接触中（ロックディレイ中）なら2回目のDROPで即座に固定
            currentPiece.pos.y++;
            const isTouching = collide(board, currentPiece);
            currentPiece.pos.y--;
            if (isTouching) {
                lockPiece();
            } else {
                const dropDistance = getGhostPos().y - currentPiece.pos.y;
                currentPiece.pos = getGhostPos();
                // 落下距離×2点をスコアに加算
                if (dropDistance > 0) {
                    score += dropDistance;
                    updateScore();
                }
                playSound('drop');
                lockDelayCounter = 0;
                dropCounter = 0;
            }
            break;
        }
    }
});

// --- モバイル操作の登録 ---
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnUp = document.getElementById('btn-up');
const btnSpace = document.getElementById('btn-space');
const btnPause = document.getElementById('btn-pause');
const btnHold = document.getElementById('btn-hold');

[btnLeft, btnRight, btnUp, btnSpace, btnPause, btnHold].forEach(btn => {
    if (btn) btn.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
});

// 長押しリピート用ヘルパー
let repeatTimers = {};

function startRepeat(key, action) {
    action();
    repeatTimers[key] = setTimeout(() => {
        repeatTimers[key + '_interval'] = setInterval(() => {
            action();
        }, 40);
    }, 200);
}

function stopRepeat(key) {
    clearTimeout(repeatTimers[key]);
    clearInterval(repeatTimers[key + '_interval']);
    delete repeatTimers[key];
    delete repeatTimers[key + '_interval'];
}

if (btnLeft) {
    // 左ボタン（長押しリピート）
    btnLeft.addEventListener('pointerdown', () => {
        startRepeat('left', () => { if (!isPaused && !isGameOver) movePiece(-1); });
    });
    btnLeft.addEventListener('pointerup', () => stopRepeat('left'));
    btnLeft.addEventListener('pointerleave', () => stopRepeat('left'));

    // 右ボタン（長押しリピート）
    btnRight.addEventListener('pointerdown', () => {
        startRepeat('right', () => { if (!isPaused && !isGameOver) movePiece(1); });
    });
    btnRight.addEventListener('pointerup', () => stopRepeat('right'));
    btnRight.addEventListener('pointerleave', () => stopRepeat('right'));

    // HOLDボタン（単発）
    if (btnHold) {
        btnHold.addEventListener('pointerdown', () => { if (!isPaused && !isGameOver) holdCurrentPiece(); });
    }

    // 回転ボタン（単発）
    btnUp.addEventListener('pointerdown', () => { if (!isPaused && !isGameOver) rotatePiece(1); });

    // DROPボタン
    btnSpace.addEventListener('pointerdown', () => {
        if (!isPaused && !isGameOver) {
            // 地面に接触中（ロックディレイ中）なら2回目のDROPで即座に固定
            currentPiece.pos.y++;
            const isTouching = collide(board, currentPiece);
            currentPiece.pos.y--;
            if (isTouching) {
                lockPiece();
            } else {
                const dropDistance = getGhostPos().y - currentPiece.pos.y;
                currentPiece.pos = getGhostPos();
                // 落下距離×2点をスコアに加算
                if (dropDistance > 0) {
                    score += dropDistance;
                    updateScore();
                }
                playSound('drop');
                lockDelayCounter = 0;
                dropCounter = 0;
            }
        } else if (isGameOver && !isWaitingForName) {
            // 名前入力中はリスタートしない
            restartGame();
        }
    });

    // ポーズボタン
    btnPause.addEventListener('pointerdown', () => {
        if (isGameOver) return;
        isPaused = !isPaused;
        const overlay = document.getElementById('pause-overlay');
        if (isPaused) {
            overlay.classList.remove('hidden');
            pauseBgm();
        } else {
            overlay.classList.add('hidden');
            resumeBgm();
            resumeGameLoop();
        }
    });
}

// BGMボタンのイベント登録
const btnBgm = document.getElementById('btn-bgm');
if (btnBgm) {
    btnBgm.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    btnBgm.addEventListener('pointerdown', () => toggleBgm());
}

// RETRYボタンのイベント登録
const btnRetry = document.getElementById('btn-retry');
if (btnRetry) {
    btnRetry.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    btnRetry.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (isGameOver && !isWaitingForName) restartGame();
    });
}

// --- STARTボタンのイベント登録 ---
const btnStart = document.getElementById('btn-start');
if (btnStart) {
    btnStart.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    btnStart.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        startGame();
    });
}

// ゲーム開始関数
function startGame() {
    if (!isWaitingStart) return;
    isWaitingStart = false;
    document.getElementById('start-overlay').classList.add('hidden');
    fillNextQueue();
    currentPiece = popNextPiece();
    updateScore();
    markDirty();
    resumeGameLoop();
}

// --- ゲーム初期化（スタート待ち状態） ---
// スタートボタンが押されるまでループは開始しない
ctx.fillStyle = '#0f172a';
ctx.fillRect(0, 0, canvas.width, canvas.height);
