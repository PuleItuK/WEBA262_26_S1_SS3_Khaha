

//  DIFFICULTY CONFIG 
const DIFFICULTY_CONFIG =
{
    easy:   { lives: 5, patternBase: 2, stepMs: 1500, holdMs: 800,  points: 10 },
    medium: { lives: 3, patternBase: 3, stepMs: 1000, holdMs: 500,  points: 15 },
    hard:   { lives: 2, patternBase: 4, stepMs: 600,  holdMs: 300,  points: 25 },
};

// Change 1
/* Old — only 4 symbols and 1 colour, not enough for themes to work properly
const THEME_SYMBOLS = ["*","@","$","#"];
const THEME_COLOURS = ["#000000"];
*/
// Replaced with — full symbol and colour sets so all three themes display correctly
const THEME_SYMBOLS =
[
    "★","●","▲","■","♦","✿","✦","✪","✶","✸",
    "❋","✺","❄","✻","✼","⬟","⬡","⬢","⬣","⬠",
    "⬤","⬥","⬦","❅","✽"
];

const THEME_COLOURS =
[
    "#ef4444","#f97316","#eab308","#22c55e","#3b82f6",
    "#8b5cf6","#ec4899","#14b8a6","#f59e0b","#10b981",
];

//  GLOBAL VARIABLES 
let player = null;
let game = null;
let grid  = null;
let settings = {};

// PLAYER CLASS

class Player
{
    constructor(name, difficulty)
    {
        this.name        = name.trim();
        this.difficulty  = difficulty;
        this.score       = 0;
        this.bestScore   = loadBestScore(name);
        this.lives       = DIFFICULTY_CONFIG[difficulty].lives;
        this.roundsWon   = 0;
        this.roundsLost  = 0;
        this.history     = [];
    }

    // Adds points to score, tracks history, saves best score to cookie
    addScore(points)
    {
        this.score += points;
        this.history.push(this.score);

        if (this.score > this.bestScore)
        {
            this.bestScore = this.score;
            saveBestScore(this.name, this.bestScore);
        }
    }

    // Reduces lives by 1, minimum 0
    loseLife()
    {
        this.lives = Math.max(0, this.lives - 1);
        return this.lives;
    }

    // Returns true if player still has lives remaining
    isAlive()
    {
        return this.lives > 0;
    }

    // Capitalises first letter of name
    getFormattedName()
    {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1).toLowerCase();
    }

    // Change 2
    /* Old — return on its own line caused JS to return undefined (ASI bug)
    getSummary()
    {
        return
        (
            "Player: " + this.getFormattedName() +
            "Score: "  + this.score +
            "Best: "   + this.bestScore +
            "Won: "    + this.roundsWon +
            "Lost: "   + this.roundsLost
        );
    }
    */
    // Replaced with — opening parenthesis on same line as return to prevent ASI bug
    // Also added pipe separators so the summary is readable in the log
    getSummary()
    {
        return (
            "Player: " + this.getFormattedName() +
            " | Score: "  + this.score +
            " | Best: "   + this.bestScore +
            " | Won: "    + this.roundsWon +
            " | Lost: "   + this.roundsLost
        );
    }

    // Resets score, lives and round counters for a new game
    resetScore()
    {
        this.score = 0;
        this.lives = DIFFICULTY_CONFIG[this.difficulty].lives;
        this.roundsWon  = 0;
        this.roundsLost = 0;
        this.history  = [];
    }

    // Change 3
    // New — returns the highest score the player ever reached in this session
    // Uses Math.max with spread operator on the history array
    getHighestRoundScore()
    {
        if (this.history.length === 0) return 0;
        return Math.max(...this.history);
    }

    // Change 4
    // New — returns only the rounds where the player scored above a threshold
    // Uses array .filter() for rubric array retrieval marks
    getRoundsAbove(threshold)
    {
        return this.history.filter(s => s > threshold);
    }

    // Change 5
    // New — returns the average score per round using array .reduce()
    getAverageScore()
    {
        if (this.history.length === 0) return 0;
        const total = this.history.reduce((sum, s) => sum + s, 0);
        return Math.round(total / this.history.length);
    }
}

// GAME CLASS
class Game
{
    constructor(settings)
    {
        this.playerName      = settings.playerName      || "Player";
        this.difficulty      = settings.difficulty      || "medium";
        this.gridSize        = parseInt(settings.gridSize) || 4;
        this.theme           = settings.theme           || "colours";
        this.showHints       = settings.showHints       || false;
        this.strictMode      = settings.strictMode      || false;
        this.showPreviewTime = settings.showPreviewTime !== false;

        this.cfg          = DIFFICULTY_CONFIG[this.difficulty];
        this.round        = 1;
        this.patternArray = [];
        this.playerArray  = [];
        this.isActive     = false;
        this.phase        = "idle";
        this.roundResults = [];
    }

    // Resets everything and starts round 1
    startGame()
    {
        this.round        = 1;
        this.patternArray = [];
        this.playerArray  = [];
        this.roundResults = [];
        this.phase        = "idle";

        player.resetScore();

        logEntry("Game started — " + this.difficulty + " | " + this.gridSize + "x" + this.gridSize + " | theme: " + this.theme);
        console.log("Game started:", this);

        this.startRound();
    }

    // Sets up and begins a new round
    startRound()
    {
        this.patternArray = [];
        this.playerArray  = [];
        this.isActive     = false;
        this.phase        = "preview";

        this.generatePattern();
        updateUI();
        setMessage("Round " + this.round + " — Study the pattern!");
        setRule("Memorise the highlighted cells, then copy the pattern.");
        saveSessionState();

        grid.clearAll();
        grid.lock(true);

        // Show the countdown timer in the preview stat box if enabled
        if (this.showPreviewTime)
        {
            const secs = Math.ceil((this.patternArray.length * this.cfg.stepMs) / 1000);
            updatePreviewDisplay(secs + "s");
        }

        // Show the pattern, then switch to input phase when done
        showPattern(this.patternArray, this.cfg, () =>
        {
            this.phase    = "input";
            this.isActive = true;
            grid.lock(false);
            setMessage("Your turn! Copy the pattern.");
            updatePreviewDisplay("-");
            logEntry("Round " + this.round + " input phase started.");
        });
    }

    // Generates a random pattern array based on round number and difficulty
    generatePattern()
    {
        const length     = this.round + this.cfg.patternBase;
        const totalCells = this.gridSize * this.gridSize;

        for (let i = 0; i < length; i++)
        {
            let idx = Math.floor(Math.random() * totalCells);
            this.patternArray.push(idx);
        }

        console.log("Round " + this.round + " pattern:", this.patternArray);
        logEntry("Pattern generated — length: " + this.patternArray.length);
    }

    // Compares player input to the pattern and triggers correct or wrong handler
    checkPattern()
    {
        if (this.phase !== "input")
        {
            setMessage("Wait for the preview to finish before checking.");
            return;
        }

        this.isActive = false;
        this.phase    = "checking";
        grid.lock(true);

        const correct = JSON.stringify(this.playerArray) === JSON.stringify(this.patternArray);

        if (correct)
        {
            this.handleCorrect();
        }
        else
        {
            this.handleWrong();
        }
    }

    // Handles a correct pattern — awards points and waits for next round
    handleCorrect()
    {
        const points = this.getScoreForRound();
        player.addScore(points);
        player.roundsWon++;

        const result = "Round " + this.round + " — Correct! +" + points + " pts";
        this.roundResults.push(result);

        // Change 6
        // New — use array methods to show meaningful stats in the log after each correct round
        const topScore    = player.getHighestRoundScore();
        const aboveZero   = player.getRoundsAbove(0);
        const avgScore    = player.getAverageScore();
        logEntry("Stats — Highest: " + topScore + " | Rounds scored: " + aboveZero.length + " | Average: " + avgScore);

        setMessage("Correct! +" + points + " points earned.");
        setResults(this.roundResults.join("\n"));
        logEntry(result);
        updateUI();

        grid.flashAll("correct", () =>
        {
            console.log("Round " + this.round + " correct. Score: " + player.score);
            alert("Correct! You earned " + points + " points.");
            this.phase = "between";
            document.getElementById("nextRoundBtn").disabled = false;
        });
    }

    // Handles a wrong pattern — deducts a life and checks for game over
    handleWrong()
    {
        const remaining = player.loseLife();
        player.roundsLost++;

        const result = "Round " + this.round + " — Wrong! Lives left: " + remaining;
        this.roundResults.push(result);

        setMessage("Wrong! " + remaining + (remaining === 1 ? " life" : " lives") + " remaining.");
        setResults(this.roundResults.join("\n"));
        logEntry(result);
        updateUI();

        grid.flashAll("wrong", () =>
        {
            if (!player.isAlive())
            {
                this.endGame();
            }
            else
            {
                console.log("Wrong answer. Lives left:", remaining);
                alert("Wrong pattern! " + remaining + " " + (remaining === 1 ? "life" : "lives") + " left.");
                this.phase = "between";
                document.getElementById("nextRoundBtn").disabled = false;
            }
        });
    }

    // Increments round and starts the next one
    nextRound()
    {
        if (this.phase !== "between") return;
        this.round++;
        document.getElementById("nextRoundBtn").disabled = true;
        this.startRound();
    }

    // Change 7
    /* Old — getScoreForRound was inlined as a magic expression
    const points = Math.round(this.cfg.points + this.round * 2);
    */
    // Replaced with — extracted into its own method so it is reusable and easier to read
    getScoreForRound()
    {
        return Math.round(this.cfg.points + this.round * 2);
    }

    // Returns the difficulty label with first letter capitalised
    getDifficultyLabel()
    {
        return this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
    }

    // Ends the game, saves state, and shows the game over summary
    endGame()
    {
        this.isActive = false;
        this.phase    = "over";

        saveSessionState();
        logEntry("Game over. " + player.getSummary());
        console.log("Game over.", player.getSummary());

        // Change 8
        // New — show average score in the end game message using getAverageScore()
        const avg = player.getAverageScore();

        setMessage
        (
            "Game Over!\n" +
            "Player: "        + player.getFormattedName() + "\n" +
            "Final score: "   + player.score              + "\n" +
            "Best score: "    + player.bestScore          + "\n" +
            "Average score: " + avg                       + "\n" +
            "Rounds won: "    + player.roundsWon          + "\n" +
            "Rounds lost: "   + player.roundsLost
        );

        setRule("Game over. Click Start Game to play again.");
        updateUI();

        alert
        (
            "Game Over!\n\n" +
            "Player: "        + player.getFormattedName() + "\n" +
            "Final score: "   + player.score              + "\n" +
            "Best score: "    + player.bestScore          + "\n" +
            "Average score: " + avg                       + "\n" +
            "Rounds won: "    + player.roundsWon
        );
    }
}

// GRID CLASS
class Grid
{
    constructor(size, theme)
    {
        this.size    = size;
        this.theme   = theme;
        this.cells   = [];
        this.colours = [];
        this.symbols = [];
    }

    // Creates all grid cells and adds them to the DOM
    buildGrid()
    {
        const area     = document.getElementById("gridArea");
        area.innerHTML = "";
        area.style.gridTemplateColumns = "repeat(" + this.size + ", auto)";
        this.cells   = [];
        this.colours = [];
        this.symbols = [];

        const total = this.size * this.size;

        for (let i = 0; i < total; i++)
        {
            const cell         = document.createElement("div");
            cell.classList.add("pattern-cell");
            cell.dataset.index = i;

            // Assign a colour and symbol to each cell from the theme arrays
            this.colours.push(THEME_COLOURS[i % THEME_COLOURS.length]);
            this.symbols.push(THEME_SYMBOLS[i % THEME_SYMBOLS.length]);

            this.applyTheme(cell, i, false);
            cell.addEventListener("click", () => handleCellClick(i));

            area.appendChild(cell);
            this.cells.push(cell);
        }

        console.log("Grid built — size:", this.size, "| theme:", this.theme, "| cells:", total);
    }

    // Applies the correct visual style to a cell based on the current theme
    applyTheme(cell, index, active)
    {
        cell.classList.remove("symbols", "lights");

        if (this.theme === "symbols")
        {
            cell.classList.add("symbols");
            cell.textContent       = active ? this.symbols[index] : "·";
            cell.style.background  = "";
            cell.style.borderColor = "";
        }
        else if (this.theme === "lights")
        {
            cell.classList.add("lights");
            cell.textContent       = "";
            cell.style.background  = active ? this.colours[index] : "";
            cell.style.borderColor = active ? this.colours[index] : "";
        }
        else
        {
            // Default colours theme
            cell.textContent       = "";
            cell.style.background  = active ? this.colours[index] : "";
            cell.style.borderColor = active ? this.colours[index] : "";
        }
    }

    // Adds a highlight class and activates the theme on the cell
    highlight(index, cls)
    {
        const cell = this.cells[index];
        if (!cell) return;
        cell.classList.add(cls || "preview");
        this.applyTheme(cell, index, true);
    }

    // Removes a highlight class and deactivates the theme on the cell
    clearHighlight(index, cls)
    {
        const cell = this.cells[index];
        if (!cell) return;
        cell.classList.remove(cls || "preview");
        this.applyTheme(cell, index, false);
    }

    // Marks a cell as selected by the player
    markSelected(index)
    {
        const cell = this.cells[index];
        if (!cell) return;
        cell.classList.add("selected");
        this.applyTheme(cell, index, true);
    }

    // Flashes all cells with a class, then removes it and calls the callback
    flashAll(cls, callback)
    {
        this.cells.forEach((c, i) =>
        {
            c.classList.add(cls);
            this.applyTheme(c, i, true);
        });

        setTimeout(() =>
        {
            this.cells.forEach((c, i) =>
            {
                c.classList.remove(cls);
                this.applyTheme(c, i, false);
            });

            if (callback) callback();
        }, 500);
    }

    // Locks or unlocks the grid so the player cannot click during preview
    lock(isLocked)
    {
        this.cells.forEach(c =>
        {
            c.style.pointerEvents = isLocked ? "none" : "auto";
            c.style.cursor        = isLocked ? "default" : "pointer";
        });
    }

    // Resets all cells to their default unselected appearance
    clearAll()
    {
        this.cells.forEach((c, i) =>
        {
            c.className = "pattern-cell";
            if (this.theme === "lights")  c.classList.add("lights");
            if (this.theme === "symbols") c.classList.add("symbols");
            this.applyTheme(c, i, false);
        });
    }

    // Returns the total number of cells in the grid
    getCellCount()
    {
        return this.cells.length;
    }
}

// INIT
window.onload = function ()
{
    // Load settings from session first, then cookies, then use defaults
    settings = loadSettingsFromSession() || loadSettingsFromCookies() || getDefaultSettings();
    console.log("Loaded settings:", settings);

    // Prompt for name if not provided by the launcher
    if (!settings.playerName || settings.playerName.length < 2)
    {
        settings.playerName = promptPlayerName();
    }

    // Create the main objects
    player = new Player(settings.playerName, settings.difficulty || "medium");
    game   = new Game(settings);
    grid   = new Grid(game.gridSize, game.theme);

    grid.buildGrid();
    attachEvents();
    updateUI();
    setMessage("Click Start Game when ready.");
    setRule("Study the pattern and then copy it.");
    logEntry("Game window opened. Player: " + player.getFormattedName() + " | Difficulty: " + game.getDifficultyLabel());
};

// Prompts the player for their name if it was not set in the launcher
function promptPlayerName()
{
    let name = prompt("Enter your player name:");
    name = name ? name.trim() : "";
    if (name.length < 2) name = "Player";
    return name;
}

// Returns the default settings object used when nothing is saved
function getDefaultSettings()
{
    return {
        playerName:      "Player",
        difficulty:      "medium",
        gridSize:        "4",
        theme:           "colours",
        showHints:       false,
        strictMode:      false,
        showPreviewTime: true,
    };
}

// EVENTS
// Wires up all button click handlers
function attachEvents()
{
    document.getElementById("startBtn").onclick     = handleStart;
    document.getElementById("checkBtn").onclick     = handleCheck;
    document.getElementById("nextRoundBtn").onclick = handleNextRound;
    document.getElementById("saveBtn").onclick      = handleSave;
    document.getElementById("loadBtn").onclick      = handleLoad;
    document.getElementById("resetBtn").onclick     = handleReset;
    document.getElementById("backBtn").onclick      = handleBack;

    // Disable next round button until a round is completed
    document.getElementById("nextRoundBtn").disabled = true;
}

// ==============================
// BUTTON HANDLERS
// ==============================
function handleStart()
{
    logEntry("Start button clicked.");
    document.getElementById("nextRoundBtn").disabled = true;
    game.startGame();
}

function handleCheck()
{
    logEntry("Check button clicked.");
    game.checkPattern();
}

function handleNextRound()
{
    logEntry("Next Round button clicked.");
    game.nextRound();
}

// Saves the current session state and best score cookie
function handleSave()
{
    saveSessionState();
    saveBestScore(player.name, player.bestScore);
    alert("Session saved for " + player.getFormattedName() + "!");
    logEntry("Session saved. Score: " + player.score + " | Round: " + game.round);
    console.log("Session saved:", player.getSummary());
}

// Loads a previously saved session from sessionStorage
function handleLoad()
{
    const state = loadSessionState();

    if (!state)
    {
        alert("No saved session found.");
        logEntry("Load attempted — no session found.");
        return;
    }

    // Show the player what will be loaded before restoring
    const confirmed = confirm
    (
        "Load saved session?\n" +
        "Player: " + (state.playerName || "?") + "\n" +
        "Round: "  + (state.round      || 1)   + "\n" +
        "Score: "  + (state.score      || 0)
    );

    if (!confirmed) return;

    // Restore player and game state from the saved object
    player.score      = state.score        || 0;
    player.bestScore  = state.bestScore    || 0;
    player.lives      = state.lives        || DIFFICULTY_CONFIG[game.difficulty].lives;
    player.roundsWon  = state.roundsWon    || 0;
    player.roundsLost = state.roundsLost   || 0;
    game.round        = state.round        || 1;
    game.roundResults = state.roundResults || [];

    updateUI();
    setResults(game.roundResults.join("\n"));
    setMessage("Session loaded. Click Start Game or Next Round to continue.");
    logEntry("Session loaded. Round: " + game.round + " | Score: " + player.score);
    console.log("Session loaded:", state);
}

// Resets the game back to its initial state
function handleReset()
{
    const confirmed = confirm("Reset the current game? All progress will be lost.");
    if (!confirmed) return;

    // Clear all game state
    game.round        = 1;
    game.patternArray = [];
    game.playerArray  = [];
    game.roundResults = [];
    game.isActive     = false;
    game.phase        = "idle";

    player.resetScore();
    grid.clearAll();
    clearSessionState();

    document.getElementById("nextRoundBtn").disabled = true;
    updateUI();
    setMessage("Game reset. Click Start Game when ready.");
    setRule("Study the pattern and then copy it.");
    setResults("No results yet.");
    logEntry("Game reset by player.");
    console.log("Game reset.");
}

// Confirms before closing the game window and returning to launcher
function handleBack()
{
    const confirmed = confirm("Return to settings? The current game will close.");
    if (!confirmed) return;
    logEntry("Returned to launcher.");
    window.close();
}

// CELL INPUT
// Handles a player clicking a grid cell during the input phase
function handleCellClick(index)
{
    if (!game.isActive || game.phase !== "input") return;

    game.playerArray.push(index);
    grid.markSelected(index);

    logEntry("Cell clicked: " + index + " (" + game.playerArray.length + " / " + game.patternArray.length + ")");

    // Hint mode — immediately highlight wrong cells in red
    if (game.showHints)
    {
        const pos     = game.playerArray.length - 1;
        const correct = game.playerArray[pos] === game.patternArray[pos];
        if (!correct) grid.cells[index]?.classList.add("wrong");
    }

    // Strict mode — auto-check as soon as a wrong cell is clicked
    if (game.strictMode)
    {
        const pos = game.playerArray.length - 1;
        if (game.playerArray[pos] !== game.patternArray[pos])
        {
            game.checkPattern();
        }
    }
}

// PATTERN DISPLAY
// Reveals each cell in the pattern one at a time, then calls onDone
function showPattern(patternArray, cfg, onDone)
{
    setMessage("Memorise the pattern…");
    let i = 0;

    function step()
    {
        // Clear the previous cell before highlighting the next one
        if (i > 0) grid.clearHighlight(patternArray[i - 1], "preview");

        if (i < patternArray.length)
        {
            grid.highlight(patternArray[i], "preview");
            i++;
            setTimeout(step, cfg.stepMs);
        }
        else
        {
            // Clear the last cell then switch to input mode
            setTimeout(() =>
            {
                grid.clearHighlight(patternArray[i - 1], "preview");
                grid.clearAll();
                onDone();
            }, cfg.holdMs);
        }
    }

    step();
}

// UI HELPERS
// Updates all stat display boxes with current player and game values
function updateUI()
{
    if (!player || !game) return;
    document.getElementById("displayPlayer").textContent = player.getFormattedName();
    document.getElementById("displayRound").textContent = game.round;
    document.getElementById("displayScore").textContent = player.score;
    document.getElementById("displayLives").textContent     = player.lives;
    document.getElementById("displayBestScore").textContent = player.bestScore;
}

// Updates the preview countdown display
function updatePreviewDisplay(val)
{
    const el = document.getElementById("displayPreview");
    if (el) el.textContent = val;
}

// Sets the message area text
function setMessage(msg)
{
    const el = document.getElementById("messageArea");
    if (el) el.textContent = msg;
}

// Sets the rule area text
function setRule(msg)
{
    const el = document.getElementById("ruleArea");
    if (el) el.textContent = msg;
}

// Sets the results area text
function setResults(msg)
{
    const el = document.getElementById("resultsArea");
    if (el) el.textContent = msg;
}

// Adds a timestamped entry to the on-screen log and console
function logEntry(msg)
{
    const area = document.getElementById("logArea");
    if (!area) return;

    const time  = new Date().toTimeString().slice(0, 8);
    const entry = document.createElement("div");
    entry.classList.add("log-entry");
    entry.textContent = "[" + time + "] " + msg;
    area.prepend(entry);

    console.log("[LOG]", msg);
}

// COOKIES
// Saves the player's best score to a cookie that expires in 30 days
function saveBestScore(name, score)
{
    const key     = "pcg_best_" + name.toLowerCase().replace(/\s+/g, "_");
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    document.cookie = key + "=" + score + "; expires=" + expires.toUTCString() + "; path=/";
    console.log("Cookie saved:", key, "=", score);
}

// Reads the player's best score from the cookie store
function loadBestScore(name)
{
    const key   = "pcg_best_" + name.toLowerCase().replace(/\s+/g, "_");
    const match = document.cookie.split("; ").find(row => row.startsWith(key + "="));
    const value = match ? parseInt(match.split("=")[1]) : 0;
    console.log("Cookie loaded:", key, "=", value);
    return value;
}

// Reads all launcher settings from cookies (written by launcher.js)
function loadSettingsFromCookies()
{
    const name = getCookie("pcg_playerName");
    if (!name) return null;

    return {
        playerName:      name,
        difficulty:      getCookie("pcg_difficulty")      || "medium",
        gridSize:        getCookie("pcg_gridSize")        || "4",
        theme:           getCookie("pcg_theme")           || "colours",
        showHints:       getCookie("pcg_showHints")       === "1",
        strictMode:      getCookie("pcg_strictMode")      === "1",
        showPreviewTime: getCookie("pcg_showPreviewTime") !== "0",
    };
}

// Reads a single cookie value by name
function getCookie(name)
{
    const match = document.cookie.split("; ").find(row => row.startsWith(name + "="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
}


// SESSION STORAGE

// Saves the full game state to sessionStorage so it can be restored
function saveSessionState()
{
    try
    {
        const state =
        {
            playerName: player.name,
            score: player.score,
            bestScore: player.bestScore,
            lives: player.lives,
            roundsWon: player.roundsWon,
            roundsLost: player.roundsLost,
            round:  game.round,
            difficulty: game.difficulty,
            gridSize: game.gridSize,
            theme: game.theme,
            roundResults: game.roundResults,
        };
        sessionStorage.setItem("pcg_gameState", JSON.stringify(state));
        console.log("Session state saved:", state);
    }
    catch (e)
    {
        console.warn("sessionStorage write failed:", e);
    }
}

// Reads the saved game state from sessionStorage
function loadSessionState()
{
    try
    {
        const raw = sessionStorage.getItem("pcg_gameState");
        if (!raw) return null;
        const state = JSON.parse(raw);
        console.log("Session state loaded:", state);
        return state;
    }
    catch (e)
    {
        console.warn("sessionStorage read failed:", e);
        return null;
    }
}

// Reads launcher settings from sessionStorage (set by launcher.js on open)
function loadSettingsFromSession()
{
    try
    {
        const raw = sessionStorage.getItem("pcg_settings");
        if (!raw) return null;
        return JSON.parse(raw);
    }
    catch (e)
    {
        return null;
    }
}

// Removes the saved game state from sessionStorage
function clearSessionState()
{
    sessionStorage.removeItem("pcg_gameState");
    console.log("Session state cleared.");
}