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
    '#ef4444'  // Z (Red 500)
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
    return {
        matrix: SHAPES[type].map(row => [...row]),
        pos: { x: Math.floor(COLS / 2) - 1, y: 0 },
        type: type,
        isBonus: type !== 4 && Math.random() < 0.03 // Oブロック（黄色正方形）にはボーナス非適用
    };
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
    triggerLockFlash(currentPiece);
    merge(board, currentPiece);
    arenaSweep(wasBonus ? 10 : 1); // ボーナスなら10倍スコア

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

// 行の消去判定とスコア計算（multiplier: ボーナスブロック時に10倍）
function arenaSweep(multiplier = 1) {
    let rowCount = 0;
    outer: for (let y = board.length - 1; y >= 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) continue outer;
        }
        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;
        rowCount++;
    }

    if (rowCount > 0) {
        const gained = rowScore[rowCount] * level * multiplier;
        if (rowCount >= 4) {
            // テトリス達成！4ライン以上消去
            playSound('tetris');
            triggerTetrisFlash(gained);
        }
        if (multiplier > 1) {
            playSound('bonus_clear');
            triggerBonusFlash(gained);
        } else if (rowCount < 4) {
            playSound('clear');
        }
        score += gained;
        level = Math.floor(score / 1000) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        updateScore();
    }
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
const TETRIS_FLASH_DURATION = 800;

function triggerTetrisFlash(gained) {
    tetrisFlashTimer = TETRIS_FLASH_DURATION;
    tetrisFlashScore = gained;
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
        ctx.restore();
    }

    // ゴーストブロックを描画
    const ghostPos = getGhostPos();
    drawMatrix(currentPiece.matrix, ghostPos, ctx, true);

    // 落下中のブロックを描画
    drawMatrix(currentPiece.matrix, currentPiece.pos, ctx, false, currentPiece.isBonus);

    // --- PC用Nextブロックの描画（1つ目） ---
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

    // --- モバイル用Nextブロックの描画（3つ） ---
    for (let i = 0; i < 3; i++) {
        if (nextQueue[i] && nextMobileCtxs[i]) {
            drawNextPiece(nextQueue[i], nextMobileCanvases[i], nextMobileCtxs[i]);
        }
    }
}

// ゲームループ
const TARGET_FPS = 20; // 20fpsに制限（バッテリー節約、テトリスには十分）
const FRAME_INTERVAL = 1000 / TARGET_FPS;
let animFrameId = null;

function update(time = 0) {
    if (isPaused || isGameOver) {
        // ポーズ/ゲームオーバー中は描画を停止（バッテリー節約）
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
    if (deltaTime < FRAME_INTERVAL) return;
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

    draw();
}

// ゲームループを再開する関数（ポーズ解除・リスタート時に使用）
function resumeGameLoop() {
    if (!animFrameId && !isPaused && !isGameOver) {
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
    lockFlashCells = [];
    lockFlashTimer = 0;
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
    if ([32, 37, 38, 39, 40, 80].includes(event.keyCode)) {
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

[btnLeft, btnRight, btnUp, btnSpace, btnPause].forEach(btn => {
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

// ゲーム開始
fillNextQueue();
currentPiece = popNextPiece();
updateScore();
update();
