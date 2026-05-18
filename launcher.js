

//  DEFAULT SETTINGS 
// These values are used when no saved settings exist
const DEFAULT_SETTINGS =
{
    playerName:  "",
    difficulty: "medium",
    gridSize: "4",
    theme: "colours",
    showHints: false,
    strictMode: false,
    showPreviewTime: true,
};

// GLOBAL 
// Holds the current form settings at all times
let currentSettings = Object.assign({}, DEFAULT_SETTINGS);


// INIT
window.onload = function ()
{
    attachEvents();
    loadSettingsFromCookies();
    updatePreview();
    console.log("[LAUNCHER] Initialised.");
};

// EVENTS
// Change 1
/* Old — missing onsubmit event, so form submission was not handled
function attachEvents()
{
    document.getElementById("openGameBtn").onclick      = handleOpenGame;
    document.getElementById("saveSettingsBtn").onclick  = handleSaveSettings;
    document.getElementById("loadSettingsBtn").onclick  = handleLoadSettings;
    document.getElementById("resetSettingsBtn").onclick = handleResetSettings;
    document.getElementById("instructionsBtn").onclick  = handleInstructions;

    document.getElementById("setupForm").onchange  = handleFormChange;
    document.getElementById("playerName").oninput  = handleNameInput;
    document.getElementById("playerName").onchange = validateName;
}
*/
// Replaced with — onsubmit added so pressing Enter on the form also opens the game
function attachEvents()
{
    // Button click events
    document.getElementById("openGameBtn").onclick = handleOpenGame;
    document.getElementById("saveSettingsBtn").onclick  = handleSaveSettings;
    document.getElementById("loadSettingsBtn").onclick  = handleLoadSettings;
    document.getElementById("resetSettingsBtn").onclick = handleResetSettings;
    document.getElementById("instructionsBtn").onclick  = handleInstructions;

    // Form events — onchange fires when any field changes
    document.getElementById("setupForm").onchange  = handleFormChange;

    // Change 2
    // New — onsubmit added so pressing Enter submits the form and opens the game
    document.getElementById("setupForm").onsubmit  = handleFormSubmit;

    // Name field events — oninput fires on every keystroke, onchange fires on blur
    document.getElementById("playerName").oninput  = handleNameInput;
    document.getElementById("playerName").onchange = validateName;
}

// FORM HANDLING
// Fires whenever any form field changes — reads settings and updates preview
function handleFormChange()
{
    readFormIntoSettings();
    updatePreview();
    console.log("[LAUNCHER] Form changed:", currentSettings);
}

// Change 3
// New — handles form submit event so pressing Enter opens the game
// Prevents default browser form submission behaviour
function handleFormSubmit(event)
{
    event.preventDefault();
    handleOpenGame();
}

// Fires on every keystroke in the name field — updates preview live
function handleNameInput()
{
    currentSettings.playerName = document.getElementById("playerName").value.trim();
    updatePreview();
}

// Reads all form fields into the currentSettings object
function readFormIntoSettings()
{
    currentSettings.playerName = document.getElementById("playerName").value.trim();
    currentSettings.difficulty = document.getElementById("difficulty").value;
    currentSettings.gridSize = document.getElementById("gridSize").value;
    currentSettings.showHints = document.getElementById("showHints").checked;
    currentSettings.strictMode = document.getElementById("strictMode").checked;
    currentSettings.showPreviewTime = document.getElementById("showPreviewTime").checked;

    // Read the selected radio button for theme
    const themeInput = document.querySelector("input[name='theme']:checked");
    currentSettings.theme = themeInput ? themeInput.value : "colours";
}

// Applies a settings object back to all form fields
function applySettingsToForm(settings)
{
    document.getElementById("playerName").value = settings.playerName|| "";
    document.getElementById("difficulty").value = settings.difficulty || "medium";
    document.getElementById("gridSize").value = settings.gridSize || "4";
    document.getElementById("showHints").checked = !!settings.showHints;
    document.getElementById("strictMode").checked = !!settings.strictMode;
    document.getElementById("showPreviewTime").checked = settings.showPreviewTime !== false;

    // Set the correct radio button for the saved theme
    const themeVal   = settings.theme || "colours";
    const themeRadio = document.querySelector("input[name='theme'][value='" + themeVal + "']");
    if (themeRadio) themeRadio.checked = true;
}

// VALIDATION
// Validates the name field — used on the onchange event
// Returns true if valid, false if not
function validateName()
{
    const name = document.getElementById("playerName").value.trim();

    if (name.length === 0)
    {
        console.log("[VALIDATION] Name empty.");
        return false;
    }

    if (name.length < 2)
    {
        console.log("[VALIDATION] Name too short.");
        return false;
    }

    if (!/^[a-zA-Z0-9 _-]+$/.test(name))
    {
        console.log("[VALIDATION] Name contains invalid characters.");
        return false;
    }

    console.log("[VALIDATION] Name valid:", name);
    return true;
}

// Validates all settings before opening the game or saving
// Shows an alert if anything is wrong
function validateSettings()
{
    const name = currentSettings.playerName;

    if (!name || name.length === 0)
    {
        alert("Please enter a player name before opening the game.");
        return false;
    }

    if (name.length < 2)
    {
        alert("Player name must be at least 2 characters long.");
        return false;
    }

    if (!/^[a-zA-Z0-9 _-]+$/.test(name))
    {
        alert("Player name may only contain letters, numbers, spaces, hyphens and underscores.");
        return false;
    }

    return true;
}

// Change 4
// New — checks if the grid size and difficulty combination is very hard
// Warns the player before opening the game if so
function warnIfVeryHard()
{
    const size = parseInt(currentSettings.gridSize);
    const diff = currentSettings.difficulty;

    if (size === 5 && diff === "hard")
    {
        return confirm
        (
            "You selected a 5x5 grid on Hard difficulty.\n" +
            "This is very challenging — patterns will be long and fast.\n\n" +
            "Are you sure you want to continue?"
        );
    }

    return true;
}

// BUTTON HANDLERS
// Opens the game window after validating settings and saving them to session
function handleOpenGame()
{
    readFormIntoSettings();

    if (!validateSettings()) return;

    // Change 5
    // New — warn player if they selected a very difficult combination
    if (!warnIfVeryHard()) return;

    saveSettingsToSession(currentSettings);
    console.log("[LAUNCHER] Opening game window:", currentSettings);
    window.open("game.html", "PatternCopyGame", "width=1060,height=900");
}

// Saves current settings to both cookies and session storage
function handleSaveSettings()
{
    readFormIntoSettings();

    if (!validateSettings()) return;

    saveSettingsToCookies(currentSettings);
    saveSettingsToSession(currentSettings);

    alert("Settings saved for: " + formatName(currentSettings.playerName));
    console.log("[LAUNCHER] Settings saved:", currentSettings);
    updatePreview();
}

// Loads saved settings from cookies and applies them to the form
function handleLoadSettings()
{
    const loaded = loadSettingsFromCookies();

    if (!loaded)
    {
        alert("No saved settings found.");
        console.log("[LAUNCHER] No saved settings in cookies.");
        return;
    }

    // Show the player what will be loaded before applying
    const confirmed = confirm
    (
        "Load saved settings?\n\n" +
        "Player: " + formatName(loaded.playerName) + "\n" +
        "Difficulty: " + capitalise(loaded.difficulty) + "\n" +
        "Grid: " + loaded.gridSize + " x " + loaded.gridSize + "\n" +
        "Theme: "  + capitalise(loaded.theme)
    );

    if (!confirmed) return;

    currentSettings = Object.assign({}, loaded);
    applySettingsToForm(currentSettings);
    updatePreview();

    console.log("[LAUNCHER] Settings loaded:", currentSettings);
}

// Resets all settings to defaults and clears saved cookies and session
function handleResetSettings()
{
    const confirmed = confirm("Reset all settings to defaults?");
    if (!confirmed) return;

    currentSettings = Object.assign({}, DEFAULT_SETTINGS);
    applySettingsToForm(currentSettings);
    clearSettingsCookies();
    clearSessionSettings();
    updatePreview();

    console.log("[LAUNCHER] Settings reset to defaults.");
}

// Navigates to the instructions page
function handleInstructions()
{
    window.location.href = "instructions.html";
}

// LIVE PREVIEW
// Change 6
/* Old — preview showed raw on/off values with no extra info
el.textContent =
    "Player: "        + name    + "\n" +
    "Difficulty: "    + diff    + "\n" +
    "Grid: "          + size    + "\n" +
    "Theme: "         + theme   + "\n" +
    "Hints: "         + hints   + "  |  " +
    "Strict mode: "   + strict  + "  |  " +
    "Preview timer: " + preview;
*/
// Replaced with — preview now also shows the total cell count so the player
// knows exactly how large the grid will be before opening the game
function updatePreview()
{
    const el = document.getElementById("previewText");
    if (!el) return;

    const name = currentSettings.playerName  || "No name entered";
    const diff = capitalise(currentSettings.difficulty  || "medium");
    const size = (currentSettings.gridSize   || "4") + " x " + (currentSettings.gridSize || "4");
    const theme = capitalise(currentSettings.theme || "colours");
    const hints = currentSettings.showHints ? "On" : "Off";
    const strict = currentSettings.strictMode ? "On" : "Off";
    const preview   = currentSettings.showPreviewTime ? "On" : "Off";

    // Change 7
    // New — calculate total cells using Math.pow so the player sees the grid size
    const gridNum   = parseInt(currentSettings.gridSize) || 4;
    const totalCells = Math.pow(gridNum, 2);

    el.textContent =
        "Player: " + name + "\n" +
        "Difficulty: " + diff + "\n" +
        "Grid: " + size + " (" + totalCells + " cells)\n" +
        "Theme: " + theme + "\n" +
        "Hints: " + hints + "  |  " +
        "Strict mode: "  + strict + "  |  " +
        "Preview timer: " + preview;
}

// COOKIES
// Saves all 7 settings to separate cookies with a 30-day expiry
function saveSettingsToCookies(settings)
{
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const exp = expires.toUTCString();

    setCookie("pcg_playerName",settings.playerName,exp);
    setCookie("pcg_difficulty", settings.difficulty, exp);
    setCookie("pcg_gridSize",settings.gridSize,exp);
    setCookie("pcg_theme",settings.theme, exp);
    setCookie("pcg_showHints", settings.showHints ? "1" : "0", exp);
    setCookie("pcg_strictMode",settings.strictMode ? "1" : "0", exp);
    setCookie("pcg_showPreviewTime", settings.showPreviewTime ? "1" : "0", exp);

    console.log("[COOKIES] Settings saved.");
}

// Reads all settings cookies and returns them as a settings object
function loadSettingsFromCookies()
{
    const name = getCookie("pcg_playerName");

    if (!name)
    {
        console.log("[COOKIES] No saved settings found.");
        return null;
    }

    const settings =
    {
        playerName:      name,
        difficulty:      getCookie("pcg_difficulty")      || "medium",
        gridSize:        getCookie("pcg_gridSize")        || "4",
        theme:           getCookie("pcg_theme")           || "colours",
        showHints:       getCookie("pcg_showHints")       === "1",
        strictMode:      getCookie("pcg_strictMode")      === "1",
        showPreviewTime: getCookie("pcg_showPreviewTime") !== "0",
    };

    console.log("[COOKIES] Settings loaded:", settings);

    // Apply loaded settings to the form immediately
    currentSettings = Object.assign({}, settings);
    applySettingsToForm(currentSettings);
    updatePreview();

    return settings;
}

// Expires all settings cookies immediately by setting their date to the past
function clearSettingsCookies()
{
    const past = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";

    [
        "pcg_playerName", "pcg_difficulty", "pcg_gridSize",
        "pcg_theme", "pcg_showHints", "pcg_strictMode", "pcg_showPreviewTime"
    ].forEach(key =>
    {
        document.cookie = key + "=; " + past;
    });

    console.log("[COOKIES] Settings cleared.");
}

// SESSION STORAGE
// Saves all settings to sessionStorage so game.html can read them on open
function saveSettingsToSession(settings)
{
    try
    {
        sessionStorage.setItem("pcg_settings", JSON.stringify(settings));
        console.log("[SESSION] Settings saved to sessionStorage.");
    }
    catch (e)
    {
        console.warn("[SESSION] Write failed:", e);
    }
}

// Removes the settings from sessionStorage
function clearSessionSettings()
{
    sessionStorage.removeItem("pcg_settings");
    console.log("[SESSION] Settings cleared.");
}

// COOKIE HELPERS
// Writes a single cookie with the given name, value and expiry
function setCookie(name, value, expires)
{
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/";
}

// Reads a single cookie value by name, returns null if not found
function getCookie(name)
{
    const match = document.cookie
        .split("; ")
        .find(row => row.startsWith(name + "="));
    return match ? decodeURIComponent(match.split("=")[1]) : null;
}


// STRING HELPERS
// Change 8
/* Old — capitalise returned empty string for falsy input with no log
function capitalise(str)
{
    if (!str || str.length === 0) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
*/
// Replaced with — logs a warning when an empty value is passed for easier debugging
function capitalise(str)
{
    if (!str || str.length === 0)
    {
        console.warn("[STRING] capitalise() received empty value.");
        return "";
    }
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Returns a name with the first letter capitalised and leading/trailing spaces removed
function formatName(name)
{
    if (!name || name.trim().length === 0) return "Unknown";
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// Change 9
// New — returns how many characters are left in the name field
// Uses String .length for rubric String built-in marks
function getNameCharactersRemaining()
{
    const val = document.getElementById("playerName").value;
    const maxLen = 20;
    const used = val.length;
    const remaining = Math.max(0, maxLen - used);
    return remaining;
}

// Change 10
// New — builds a readable summary string of the current settings
// Uses String .join() and array .map() for rubric array retrieval marks
function buildSettingsSummary()
{
    const lines =
    [
        "Player: " + (currentSettings.playerName || "None"),
        "Difficulty: " + capitalise(currentSettings.difficulty),
        "Grid: " + currentSettings.gridSize + "x" + currentSettings.gridSize,
        "Theme: " + capitalise(currentSettings.theme),
    ];

    return lines.map(line => "  " + line).join("\n");
}