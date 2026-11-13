/* ==========================================================================
   PYQUEST: SOLO CODE LEVELING (AAA+ EDITION)
   File 4/5: data_classes.js — Complete Offline Bilingual RPG Data Architecture
   STEP 3 Production Implementation:
   - window.GameData & window.PYQUEST_DATA (100% Backward Compatible)
   - Complete Bilingual UI Dictionary (English + Natural Pakistani Roman Urdu)
   - Hunter Ranks (0, 150, 300, 500 XP)
   - 3 Playable Hunter Classes (Python, JavaScript, C++)
   - 177 Handcrafted Campaign Questions (Levels 1–10: 59 per Class)
   - Extended Parameterized Progression System (Levels 11–400)
   - 100% Offline Zero-Dependency Execution
   ========================================================================== */

(function () {
  "use strict";

  if (window.GameData && window.GameData.__initializedStep3) {
    return;
  }

  /* ========================================================================
     1. CORE BILINGUAL & QUESTION SCHEMA HELPERS
     ======================================================================== */

  function getActiveLang() {
    if (typeof document !== "undefined") {
      const btn = document.getElementById("lang-toggle");
      if (btn && btn.dataset && (btn.dataset.lang === "ur" || btn.dataset.lang === "en")) {
        return btn.dataset.lang;
      }
    }
    return "en";
  }

  /**
   * Creates a bilingual { en, ur } object that also coerces cleanly to a
   * string in the active language if consumed directly by legacy DOM code.
   */
  function bi(en, ur) {
    const obj = {
      en: String(en),
      ur: String(ur !== undefined ? ur : en),
    };
    Object.defineProperty(obj, "toString", {
      value: function () {
        return getActiveLang() === "ur" ? this.ur : this.en;
      },
      enumerable: false,
      configurable: true,
    });
    Object.defineProperty(obj, "valueOf", {
      value: function () {
        return getActiveLang() === "ur" ? this.ur : this.en;
      },
      enumerable: false,
      configurable: true,
    });
    return obj;
  }

  /**
   * Creates a hybrid bilingual options structure supporting both:
   * - Step 3 schema: options.en (4 items) and options.ur (4 items)
   * - Step 1 engine.js: options[0..3] indexed access
   */
  function makeOptions(enArr, urArr) {
    const enList = (enArr || []).slice(0, 4).map(String);
    const urList = (urArr || enArr || []).slice(0, 4).map(String);
    const hybrid = enList.slice();
    hybrid.en = enList;
    hybrid.ur = urList;
    return hybrid;
  }

  /**
   * Safe offline normalization for Live Code Terminal answers.
   * Normalizes outer whitespace, single vs double quotes, and optional trailing semicolons
   * without ever invoking unsafe eval().
   */
  function normalizeCodeAnswer(input, options) {
    if (typeof input !== "string") return "";
    const opts = options || {};
    let str = input.trim();
    // Normalize smart quotes to standard ASCII quotes and unify single/double quotes
    str = str
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019']/g, '"');
    // Remove all whitespace outside or inside for compact comparison
    str = str.replace(/\s+/g, "");
    if (opts.stripTrailingSemicolon) {
      str = str.replace(/;+$/, "");
    }
    if (opts.caseInsensitive) {
      str = str.toLowerCase();
    }
    return str;
  }

  /**
   * Expands acceptedAnswers with safe quote & whitespace variants so both
   * Step 1 engine.js (which checks ans.replace(/\s+/g, "") === normalized)
   * and Step 3 GameData.validateUltimateAnswer work seamlessly offline.
   */
  function expandAcceptedAnswers(rawAnswers) {
    const set = new Set();
    (rawAnswers || []).forEach((ans) => {
      if (typeof ans !== "string" || !ans.trim()) return;
      const trimmed = ans.trim();
      const singleQ = trimmed.replace(/"/g, "'");
      const doubleQ = trimmed.replace(/'/g, '"');
      const variants = [
        trimmed,
        singleQ,
        doubleQ,
        trimmed.toLowerCase(),
        singleQ.toLowerCase(),
        doubleQ.toLowerCase(),
      ];
      variants.forEach((v) => {
        set.add(v);
        if (v.endsWith(";")) {
          set.add(v.slice(0, -1));
        } else {
          set.add(v + ";");
        }
      });
    });
    return Array.from(set);
  }

  function validateUltimateAnswer(userInput, questionObj) {
    if (!questionObj || !Array.isArray(questionObj.acceptedAnswers)) return false;
    const raw = String(userInput || "").trim();
    if (!raw) return false;
    const normExact = normalizeCodeAnswer(raw, { stripTrailingSemicolon: true, caseInsensitive: false });
    const normLower = normalizeCodeAnswer(raw, { stripTrailingSemicolon: true, caseInsensitive: true });
    return questionObj.acceptedAnswers.some((ans) => {
      const aExact = normalizeCodeAnswer(ans, { stripTrailingSemicolon: true, caseInsensitive: false });
      const aLower = normalizeCodeAnswer(ans, { stripTrailingSemicolon: true, caseInsensitive: true });
      return aExact === normExact || aLower === normLower;
    });
  }

  /**
   * Normalizes a question object so it exposes both the Step 3 schema
   * (attackType, q, code, options:{en,ur}, correct, exp, placeholder, acceptedAnswers, hint)
   * and Step 1 engine.js aliases (mode, prompt, correctIndex, explain).
   */
  function makeQuestion(cfg) {
    const attackType = cfg.attackType || cfg.mode || "light";
    const q = cfg.q ? bi(cfg.q.en, cfg.q.ur) : bi(cfg.prompt.en, cfg.prompt.ur);
    const exp = cfg.exp ? bi(cfg.exp.en, cfg.exp.ur) : bi(cfg.explain.en, cfg.explain.ur);
    const code = typeof cfg.code === "string" ? cfg.code : "";

    const question = {
      id: cfg.id || "",
      attackType: attackType,
      mode: attackType,
      q: q,
      prompt: q,
      code: code,
      exp: exp,
      explain: exp,
    };

    if (attackType === "ultimate") {
      const placeholder = cfg.placeholder || "print(\"Arise\")";
      const hintObj =
        cfg.hint && typeof cfg.hint === "object"
          ? bi(cfg.hint.en, cfg.hint.ur)
          : bi(`Type: ${placeholder}`, `Yeh type karein: ${placeholder}`);
      const accepted = expandAcceptedAnswers(
        cfg.acceptedAnswers && cfg.acceptedAnswers.length ? cfg.acceptedAnswers : [placeholder]
      );
      question.placeholder = placeholder;
      question.acceptedAnswers = accepted;
      question.hint = hintObj;
      question.options = makeOptions(
        [placeholder, "SyntaxError", "None", "Skip"],
        [placeholder, "SyntaxError", "None", "Skip"]
      );
      question.correct = 0;
      question.correctIndex = 0;
    } else {
      const enOpts = cfg.options && cfg.options.en ? cfg.options.en : cfg.options || [];
      const urOpts = cfg.options && cfg.options.ur ? cfg.options.ur : enOpts;
      const correctIdx =
        typeof cfg.correct === "number"
          ? cfg.correct
          : typeof cfg.correctIndex === "number"
          ? cfg.correctIndex
          : 0;
      question.options = makeOptions(enOpts, urOpts);
      question.correct = correctIdx;
      question.correctIndex = correctIdx;
      if (cfg.hint) {
        question.hint =
          typeof cfg.hint === "object" ? bi(cfg.hint.en, cfg.hint.ur) : bi(cfg.hint, cfg.hint);
      }
    }

    if (cfg.bossTaunt) {
      question.bossTaunt = bi(cfg.bossTaunt.en, cfg.bossTaunt.ur);
    }

    return question;
  }

  /**
   * Synchronizes the active question's properties onto a Level object so
   * legacy Step 1 engine.js (which reads lvl.mode, lvl.prompt, lvl.code, etc.)
   * and Step 3 consumers (which read lvl.questions) both work natively.
   */
  function syncLevelActiveQuestion(lvl, index) {
    if (!lvl || !Array.isArray(lvl.questions) || lvl.questions.length === 0) return lvl;
    const safeIdx = ((index % lvl.questions.length) + lvl.questions.length) % lvl.questions.length;
    lvl.currentQuestionIndex = safeIdx;
    const activeQ = lvl.questions[safeIdx];

    lvl.attackType = activeQ.attackType;
    lvl.mode = activeQ.mode;
    lvl.q = activeQ.q;
    lvl.prompt = activeQ.prompt;
    lvl.code = activeQ.code;
    lvl.options = activeQ.options;
    lvl.correct = activeQ.correct;
    lvl.correctIndex = activeQ.correctIndex;
    lvl.exp = activeQ.exp;
    lvl.explain = activeQ.explain;
    lvl.placeholder = activeQ.placeholder || "";
    lvl.acceptedAnswers = activeQ.acceptedAnswers || [];
    lvl.hint = activeQ.hint || bi("", "");
    if (activeQ.bossTaunt) {
      lvl.activeBossTaunt = activeQ.bossTaunt;
    }
    return lvl;
  }

  function makeLevel(cfg) {
    const questions = (cfg.questions || []).map((q, idx) =>
      makeQuestion(Object.assign({ id: `L${cfg.level}_Q${idx + 1}` }, q))
    );
    const lvl = {
      level: cfg.level,
      gateRank: cfg.gateRank || (cfg.isBoss ? "S-Rank BOSS" : "E-Rank"),
      enemyName: cfg.enemyName || "GLITCH SENTINEL",
      enemyTitle: cfg.enemyTitle
        ? bi(cfg.enemyTitle.en, cfg.enemyTitle.ur)
        : bi(cfg.enemyName || "GLITCH SENTINEL", cfg.enemyName || "GLITCH SENTINEL"),
      topic: cfg.topic ? bi(cfg.topic.en, cfg.topic.ur) : bi("Core Syntax", "Bunyadi Syntax"),
      isBoss: Boolean(cfg.isBoss),
      timer: cfg.timer || 15,
      timeLimit: cfg.timer || 15,
      questionCount: questions.length,
      questions: questions,
      currentQuestionIndex: 0,
    };

    if (cfg.isBoss) {
      lvl.bossTaunts = (cfg.bossTaunts || []).map((t) => bi(t.en, t.ur));
      lvl.victoryDialogue = cfg.victoryDialogue
        ? bi(cfg.victoryDialogue.en, cfg.victoryDialogue.ur)
        : bi(
            "IMPOSSIBLE! My S-Rank core has been cleaved by your code!",
            "NAMUMKIN! Tumhare code ne mera S-Rank core tod diya!"
          );
      lvl.defeatDialogue = cfg.defeatDialogue
        ? bi(cfg.defeatDialogue.en, cfg.defeatDialogue.ur)
        : bi(
            "Pathetic Hunter! Your syntax is too weak for this Red Gate!",
            "Kamzor Hunter! Tumhara syntax is Red Gate ke samne kuch nahi!"
          );
    }

    syncLevelActiveQuestion(lvl, 0);
    return lvl;
  }

  /* ========================================================================
     2. BILINGUAL UI DICTIONARY (GameData.ui)
     Every player-facing UI element supports { en, ur }
     ======================================================================== */
  const UI = {
    gameTitle: bi(
      "PyQuest: Solo Code Leveling (AAA+ Edition)",
      "PyQuest: Solo Code Leveling (AAA+ Edition)"
    ),
    hudClassTooltip: bi(
      "Active Hunter Coding Class",
      "Aap ka mojooda Hunter Coding Class"
    ),
    hudRankTooltip: bi(
      "Current Hunter System Rank",
      "Mojooda Hunter System Rank"
    ),
    hudLevelTooltip: bi(
      "Current Dungeon Gate Level",
      "Mojooda Dungeon Gate Level"
    ),
    hudXpLabel: bi("💎 XP:", "💎 XP:"),
    hudXpTooltip: bi(
      "Total System XP Available",
      "Kul mojooda System XP"
    ),
    hudStreakTooltip: bi(
      "Combo Streak (3+ triggers Awakened Monarch Aura)",
      "Combo Streak (3+ par Awakened Monarch Aura active hota hai)"
    ),
    hudTimerTooltip: bi(
      "Combat Strike Countdown Timer (15s)",
      "Jangi Hamle ka Countdown Timer (15s)"
    ),
    hudGatesBtn: bi("🗺️ Gates", "🗺️ Gates"),
    hudGatesTooltip: bi(
      "Open Hunter Class & Dungeon Gate Map",
      "Hunter Class aur Dungeon Gate Map kholein"
    ),
    shopPotionBtn: bi("🧪 Potion (15 XP)", "🧪 Potion (15 XP)"),
    shopPotionTooltip: bi(
      "Restore +30% Hero HP (Cost: 15 XP)",
      "Hero ki +30% HP bahal karein (Qeemat: 15 XP)"
    ),
    shop5050Btn: bi("👁️ Shadow 50/50 (10 XP)", "👁️ Shadow 50/50 (10 XP)"),
    shop5050Tooltip: bi(
      "Shadow 50/50: Eliminate 2 wrong MCQ options (Cost: 10 XP)",
      "Shadow 50/50: 2 ghalat MCQ options hatayein (Qeemat: 10 XP)"
    ),
    shopSkipBtn: bi("⏭️ Dodge/Skip (2 XP)", "⏭️ Dodge/Skip (2 XP)"),
    shopSkipTooltip: bi(
      "Shadow Step Dodge: Safely skip current question (Cost: 2 XP)",
      "Shadow Step Dodge: Mojooda sawal safely skip karein (Qeemat: 2 XP)"
    ),
    langToggleEn: bi("🇬🇧 English", "🇵🇰 Roman Urdu"),
    langToggleTooltip: bi(
      "1-Click Instant Bilingual Switch (Roman Urdu / English)",
      "1-Click Zaban Tabdeel Karein (Roman Urdu / English)"
    ),
    audioOnBtn: bi("🔊 SFX/BGM ON", "🔊 Awaz/BGM ON"),
    audioMuteBtn: bi("🔇 MUTE", "🔇 Khamosh"),
    audioToggleTooltip: bi(
      "Toggle Web Audio Synth SFX & BGM",
      "Web Audio Synth SFX aur BGM on/off karein"
    ),
    heroName: bi("JIN-CODE", "JIN-CODE"),
    heroVitalityLabel: bi("HUNTER VITALITY", "HUNTER TAWANAI"),
    monarchCoreBadge: bi("⚡ MONARCH CORE", "⚡ MONARCH CORE"),
    shadowArmyBuffBadge: bi("👻 SHADOW ARMY BUFF", "👻 SHADOW ARMY TAQAT"),
    enemyCorruptedLabel: bi("CORRUPTED ENTITY", "CORRUPTED DUSHMAN"),
    attackBadgeLight: bi(
      "⚡ LIGHT ATTACK: QUICK MCQ",
      "⚡ LIGHT ATTACK: FAURI MCQ"
    ),
    attackBadgeHeavy: bi(
      "🔥 HEAVY ATTACK: BUG BREAKER",
      "🔥 HEAVY ATTACK: BUG BREAKER"
    ),
    attackBadgeUltimate: bi(
      "🌌 ULTIMATE SKILL: LIVE CODE TERMINAL",
      "🌌 ULTIMATE SKILL: LIVE CODE TERMINAL"
    ),
    keybindHintLight: bi(
      "KEYS [A] [B] [C] [D] OR CLICK TO STRIKE",
      "WAR KARNE KE LIYE [A] [B] [C] [D] DABAYEIN YA CLICK KAREIN"
    ),
    keybindHintHeavy: bi(
      "ANALYZE THE BUG & SELECT THE FIX [A-D]",
      "BUG PEHCHANEIN AUR SAHI FIX CHUNEIN [A-D]"
    ),
    keybindHintUltimate: bi(
      "TYPE LIVE CODE & PRESS ENTER TO SLASH",
      "LIVE CODE TYPE KAREIN AUR WAR KE LIYE ENTER DABAYEIN"
    ),
    executeSlashBtn: bi("⚡ EXECUTE SLASH", "⚡ EXECUTE SLASH (WAR KAREIN)"),
    terminalPlaceholder: bi(
      "Type code here to cast Ultimate Slash...",
      "Ultimate Slash chalane ke liye yahan code likhein..."
    ),
    feedbackCriticalTitle: bi(
      "⚡ CRITICAL HIT // SYSTEM ANALYSIS",
      "⚡ CRITICAL HIT // SYSTEM EXPLANATION"
    ),
    feedbackCounterTitle: bi(
      "🚨 COUNTER DAMAGE TAKEN // SYSTEM DIAGNOSTIC",
      "🚨 COUNTER DAMAGE TAKEN // BUG DETECTED"
    ),
    nextStrikeBtn: bi("NEXT STRIKE ➔", "AGLA WAR ➔"),
    classModalTitle: bi(
      "🏰 HUNTER AWAKENING & DUNGEON GATES",
      "🏰 HUNTER AWAKENING AUR DUNGEON GATES"
    ),
    classModalSubtitle: bi(
      "Select your Coding Combat Class and enter an active Dungeon Gate (Levels 1–10)",
      "Apna Coding Combat Class chunein aur Dungeon Gate mein dakhil hon (Levels 1–10)"
    ),
    gateGridHeading: bi(
      "🗺️ SELECT DUNGEON GATE (LEVELS 1–9 MINIONS // LEVEL 10 S-RANK RED GATE BOSS)",
      "🗺️ DUNGEON GATE CHUNEIN (LEVELS 1–9 MINIONS // LEVEL 10 S-RANK RED GATE BOSS)"
    ),
    enterGateBtn: bi("⚔️ ENTER DUNGEON GATE", "⚔️ DUNGEON GATE MEIN DAKHIL HON"),
    bossAlertHeader: bi(
      "🚨 RED GATE EMERGENCY ALERT // SYSTEM HAZARD LEVEL: EXTREME 🚨",
      "🚨 RED GATE EMERGENCY ALERT // KHATRA LEVEL: INTAHAI ZYADA 🚨"
    ),
    bossAlertTitle: bi(
      "WARNING: S-RANK DUNGEON BOSS DETECTED",
      "KHABARDAR: S-RANK DUNGEON BOSS SAMNE HAI"
    ),
    ariseModalTitle: bi(
      "👻 SHADOW EXTRACTION AVAILABLE",
      "👻 SHADOW EXTRACTION DASTIYAB HAI"
    ),
    ariseModalSubtitle: bi(
      "The S-Rank Dungeon Boss has fallen. Command its shadow to join your army!",
      "S-Rank Dungeon Boss gir chuka hai. Uske saye ko apni fauj mein shamil hone ka hukm dein!"
    ),
    ariseExtractBtn: bi(
      "[ 👻 ARISE! (EXTRACT SHADOW) ]",
      "[ 👻 ARISE! (SHADOW NIKALEIN) ]"
    ),
    victoryTitleGate: bi(
      "🏆 DUNGEON GATE CLEARED!",
      "🏆 DUNGEON GATE FATAH HO GAYA!"
    ),
    victoryTitleBoss: bi(
      "👑 S-RANK RED GATE CONQUERED!",
      "👑 S-RANK RED GATE MUKAMMAL FATAH!"
    ),
    victorySubtitle: bi(
      "System Evaluation Complete — Hunter Rank Progress Updated",
      "System Evaluation Complete — Hunter Rank aur XP update ho gaye!"
    ),
    defeatTitle: bi(
      "💀 SYSTEM ALERT: HUNTER DOWN",
      "💀 SYSTEM ALERT: HUNTER GIR GAYA"
    ),
    defeatSubtitle: bi(
      "Hunter vitality depleted! Re-enter the gate and strike again.",
      "Vitality khatam ho gayi! Dobara gate mein ja kar koshish karein."
    ),
    statXpEarned: bi("XP EARNED", "KUL XP"),
    statMaxStreak: bi("MAX STREAK", "MAX STREAK"),
    statHunterRank: bi("HUNTER RANK", "HUNTER RANK"),
    statAccuracy: bi("ACCURACY", "DURUSTGI"),
    nextLevelBtn: bi("NEXT LEVEL ➔", "AGLA LEVEL ➔"),
    retryGateBtn: bi("🔄 RETRY GATE", "🔄 DOBARA KOSHISH"),
    switchClassBtn: bi("🏰 SWITCH CLASS", "🏰 CLASS BADLEIN"),
    hunterDialogueReady: bi(
      "System synchronized. My blade is ready to compile.",
      "System sync ho gaya. Meri talwar code compile karne ke liye tayyar hai."
    ),
    hunterDialogueStreak: bi(
      "Shadow Monarch Aura awakened! Every line of code strikes true!",
      "Shadow Monarch Aura jaag utha! Har line ka code seedha nishane par lag raha hai!"
    ),
    hunterDialogueArise: bi(
      "Arise... and serve my Shadow Code Legion!",
      "Arise... aur meri Shadow Code Fauj ka hissa ban jao!"
    ),
    bossDialogueIntro: bi(
      "Foolish Hunter! Let us see if your logic survives my Red Gate!",
      "Nadan Hunter! Dekhte hain tumhari logic mere Red Gate mein kitni der tikti hai!"
    ),
    systemNotificationHeal: bi(
      "🧪 Hunter Vitality Restored (+30% HP)!",
      "🧪 Hunter ki tawanai bahal ho gayi (+30% HP)!"
    ),
    systemNotification5050: bi(
      "👁️ Shadow 50/50 eliminated 2 corrupted options!",
      "👁️ Shadow 50/50 ne 2 ghalat options mita diye!"
    ),
    systemNotificationSkip: bi(
      "⏭️ Shadow Step Dodge executed safely!",
      "⏭️ Shadow Step Dodge kamyabi se mukammal hua!"
    ),
    systemTimeExpired: bi(
      "Time expired! The enemy unleashed a counter-strike!",
      "Waqt khatam! Dushman ne counter-attack kar diya!"
    ),
  };

  /* ========================================================================
     3. HUNTER RANKS (GameData.ranks & PYQUEST_DATA.HUNTER_RANKS)
     XP | English                   | Roman Urdu
     0  | 🛡️ E-Rank Rookie          | 🛡️ E-Rank Naya Hunter
     150| 🔮 C-Rank Code Mage       | 🔮 C-Rank Code Jadugar
     300| ⚔️ A-Rank Cyber Hunter    | ⚔️ A-Rank Cyber Shikari
     500| 👑 S-Rank Shadow Monarch  | 👑 S-Rank Shadow Badshah
     ======================================================================== */
  const RANKS = [
    {
      xp: 0,
      minXP: 0,
      id: "e_rank",
      short: "E-RANK",
      en: "🛡️ E-Rank Rookie",
      ur: "🛡️ E-Rank Naya Hunter",
      badge: "🛡️ E-Rank Rookie",
      title: bi("🛡️ E-Rank Rookie", "🛡️ E-Rank Naya Hunter"),
      name: bi("🛡️ E-Rank Rookie", "🛡️ E-Rank Naya Hunter"),
    },
    {
      xp: 150,
      minXP: 150,
      id: "c_rank",
      short: "C-RANK",
      en: "🔮 C-Rank Code Mage",
      ur: "🔮 C-Rank Code Jadugar",
      badge: "🔮 C-Rank Code Mage",
      title: bi("🔮 C-Rank Code Mage", "🔮 C-Rank Code Jadugar"),
      name: bi("🔮 C-Rank Code Mage", "🔮 C-Rank Code Jadugar"),
    },
    {
      xp: 300,
      minXP: 300,
      id: "a_rank",
      short: "A-RANK",
      en: "⚔️ A-Rank Cyber Hunter",
      ur: "⚔️ A-Rank Cyber Shikari",
      badge: "⚔️ A-Rank Cyber Hunter",
      title: bi("⚔️ A-Rank Cyber Hunter", "⚔️ A-Rank Cyber Shikari"),
      name: bi("⚔️ A-Rank Cyber Hunter", "⚔️ A-Rank Cyber Shikari"),
    },
    {
      xp: 500,
      minXP: 500,
      id: "s_rank",
      short: "S-RANK",
      en: "👑 S-Rank Shadow Monarch",
      ur: "👑 S-Rank Shadow Badshah",
      badge: "👑 S-Rank Shadow Monarch",
      title: bi("👑 S-Rank Shadow Monarch", "👑 S-Rank Shadow Badshah"),
      name: bi("👑 S-Rank Shadow Monarch", "👑 S-Rank Shadow Badshah"),
    },
  ];

  /* ========================================================================
     4. PYTHON CLASS — LEVELS 1 TO 5 (HANDCRAFTED)
     Distribution: L1(3), L2(5), L3(5), L4(5), L5(5) = 23 Questions
     ======================================================================== */
  const PYTHON_LEVELS_1_TO_5 = [
    /* ----------------------------------------------------------------------
       PYTHON LEVEL 1 — Output and Syntax Basics: print() (3 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 1,
      gateRank: "E-Rank",
      enemyName: "SYNTAX SLIME",
      topic: {
        en: "Level 1 — Output and Syntax Basics (print)",
        ur: "Level 1 — Output aur Syntax ki Bunyad (print)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which Python built-in function displays text on the Hunter System console?",
            ur: "Hunter System console par text dikhane ke liye kaunsa Python function istemal hota hai?",
          },
          code: `# Display "Shadow Awake" on the screen\nprint("Shadow Awake")`,
          options: {
            en: ["print()", "echo()", "console.log()", "cout"],
            ur: ["print()", "echo()", "console.log()", "cout"],
          },
          correct: 0,
          exp: {
            en: "In Python, `print()` sends text or values inside parentheses directly to the console output.",
            ur: "Python mein screen par koi bhi text ya value dikhane ke liye `print()` function istemal hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this Python code fail with a SyntaxError?",
            ur: "BUG BREAKER: Yeh Python code SyntaxError kyun de raha hai?",
          },
          code: `# Broken output command\nprint("Hunter Awakened"`,
          options: {
            en: [
              "Missing closing parenthesis `)` at the end of print()",
              "print must start with a capital P",
              "Double quotes are not allowed in Python",
              "Missing semicolon at the end of the line",
            ],
            ur: [
              "print() ke aakhir mein band karne wali bracket `)` missing hai",
              "print ka P capital hona chahiye",
              "Python mein double quotes mana hain",
              "Line ke aakhir mein semicolon missing hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Every opening parenthesis `(` in `print(\"Hunter Awakened\")` must be closed with a matching `)`.",
            ur: "`print(\"Hunter Awakened\")` mein shuru ki bracket `(` ko aakhir mein `)` se band karna zaroori hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the Python code to print `\"Arise\"` to the console.",
            ur: "ULTIMATE TERMINAL: Console par `\"Arise\"` print karne ke liye Python code type karein.",
          },
          code: `# Cast your first Shadow Command on the console:`,
          placeholder: 'print("Arise")',
          acceptedAnswers: ['print("Arise")', "print('Arise')", 'print("arise")', "print('arise')"],
          hint: {
            en: 'Type: print("Arise")',
            ur: 'Yeh type karein: print("Arise")',
          },
          exp: {
            en: "`print(\"Arise\")` outputs the string Arise to the terminal, completing your Level 1 strike!",
            ur: "`print(\"Arise\")` console par Arise print karta hai aur aapka Level 1 strike mukammal karta hai!",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 2 — Strings vs Numbers and Quotes (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 2,
      gateRank: "E-Rank",
      enemyName: "QUOTE PHANTOM",
      topic: {
        en: "Level 2 — Strings vs Numbers and Quotes",
        ur: "Level 2 — Strings Bamane Numbers aur Quotes",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What is the exact difference between `print(50 + 50)` and `print(\"50 + 50\")` in Python?",
            ur: "Python mein `print(50 + 50)` aur `print(\"50 + 50\")` ke output mein kya farq hai?",
          },
          code: `print(50 + 50)\nprint("50 + 50")`,
          options: {
            en: [
              "First prints 100 (number math), second prints 50 + 50 (literal text)",
              "Both print 100",
              "Both print 50 + 50",
              "Second line causes a SyntaxError",
            ],
            ur: [
              "Pehla 100 print karega (hisab), doosra 50 + 50 (text) print karega",
              "Dono 100 print karenge",
              "Dono 50 + 50 print karenge",
              "Doosri line SyntaxError degi",
            ],
          },
          correct: 0,
          exp: {
            en: "Without quotes, `50 + 50` is evaluated as numerical addition (`100`). Inside quotes, `\"50 + 50\"` is treated as a string of characters.",
            ur: "Quotes ke baghair `50 + 50` jama ho kar `100` banta hai, jabke quotes ke andar `\"50 + 50\"` ek string (text) ban jata hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will `print(\"10\" + \"20\")` output in Python?",
            ur: "Python mein `print(\"10\" + \"20\")` kya output dega?",
          },
          code: `print("10" + "20")`,
          options: {
            en: ["30", "1020", "10 20", "TypeError"],
            ur: ["30", "1020", "10 20", "TypeError"],
          },
          correct: 1,
          exp: {
            en: "Because both `\"10\"` and `\"20\"` are inside quotes, Python concatenates (joins) the two strings into `\"1020\"`.",
            ur: "Kyunke `\"10\"` aur `\"20\"` dono quotes mein strings hain, Python `+` se unhein jor kar `\"1020\"` bana deta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this line crash with a SyntaxError?",
            ur: "BUG BREAKER: Yeh code SyntaxError ke sath kyun ruk jata hai?",
          },
          code: `print("Shadow Monarch')`,
          options: {
            en: [
              "Numbers are missing inside print()",
              "Mismatched quotes: starts with double quote `\"` and ends with single quote `'`",
              "Strings cannot contain spaces",
              "print() only accepts single words",
            ],
            ur: [
              "print() ke andar numbers nahi hain",
              "Quotes match nahi kar rahe: shuru mein `\"` hai aur aakhir mein `'`",
              "Strings mein space nahi aa sakti",
              "print() sirf ek lafz leta hai",
            ],
          },
          correct: 1,
          exp: {
            en: "A Python string must start and end with the same type of quote: either `\"Shadow Monarch\"` or `'Shadow Monarch'`.",
            ur: "Python string jis quote (`\"` ya `'`) se shuru ho, usi quote par khatam hona zaroori hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `print(\"Rank: \" + 1)` raise a TypeError in Python?",
            ur: "BUG BREAKER: Python mein `print(\"Rank: \" + 1)` par TypeError kyun aata hai?",
          },
          code: `# Broken string + integer combination\nprint("Rank: " + 1)`,
          options: {
            en: [
              "Python cannot directly add a string (`\"Rank: \"`) and an integer (`1`) without converting `1` to `\"1\"`",
              "The number 1 is negative",
              "Plus operator `+` does not exist in Python",
              "Rank must be lowercase",
            ],
            ur: [
              "Python mein string (`\"Rank: \"`) aur number (`1`) ko seedha `+` nahi kar sakte; `" +
                'print("Rank: " + "1")' +
                "` ya `str(1)` chahiye",
              "Number 1 manfi (negative) hai",
              "Python mein `+` operator nahi hota",
              "Rank chhote harfon mein hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "Python does not implicitly convert numbers when concatenating with strings. Use `\"Rank: \" + \"1\"` or `str(1)`.",
            ur: "Python string aur int ko khud nahi jorta. Isko theek karne ke liye `\"1\"` quotes mein likhein ya `str(1)` istemal karein.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the Python statement to print the number `100` (as a number, without quotes).",
            ur: "ULTIMATE TERMINAL: Number `100` ko baghair quotes ke print karne ka Python code likhein.",
          },
          code: `# Output the numeric mana value 100:`,
          placeholder: "print(100)",
          acceptedAnswers: ["print(100)"],
          hint: {
            en: "Type: print(100)",
            ur: "Yeh type karein: print(100)",
          },
          exp: {
            en: "`print(100)` outputs the numerical integer value `100` directly without string quotes.",
            ur: "`print(100)` baghair quotes ke seedha integer number `100` print karta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 3 — Comments and Code Readability: # (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 3,
      gateRank: "D-Rank",
      enemyName: "COMMENT GARGOYLE",
      topic: {
        en: "Level 3 — Comments and Code Readability (#)",
        ur: "Level 3 — Comments aur Code kiWazahat (#)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which symbol starts a single-line comment in Python?",
            ur: "Python mein single-line comment shuru karne ke liye kaunsa nishan (symbol) lagta hai?",
          },
          code: `# This note is ignored by Python\nprint("Gate Open")`,
          options: {
            en: ["#", "//", "/* */", "--"],
            ur: ["#", "//", "/* */", "--"],
          },
          correct: 0,
          exp: {
            en: "Python uses the hash symbol `#` for comments. Everything after `#` on that line is ignored by the interpreter.",
            ur: "Python mein comment ke liye `#` istemal hota hai. `#` ke baad likhi gayi line ko Python run nahi karta.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will be printed when this commented Python script runs?",
            ur: "Jab yeh Python code chalega to screen par kya print hoga?",
          },
          code: `# print("Trap Triggered")\nprint("Safe Passage") # inline comment`,
          options: {
            en: ["Trap Triggered", "Safe Passage", "Safe Passage # inline comment", "Nothing"],
            ur: ["Trap Triggered", "Safe Passage", "Safe Passage # inline comment", "Kuch bhi nahi"],
          },
          correct: 1,
          exp: {
            en: "Line 1 is completely commented out with `#`, and the `# inline comment` at the end of Line 2 is also ignored, so only `Safe Passage` prints.",
            ur: "Pehli line `#` ki wajah se skip ho jati hai aur doosri line se sirf `Safe Passage` print hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: A rookie Hunter tried to write a comment using `//` in Python. How do you fix it?",
            ur: "BUG BREAKER: Ek naye Hunter ne Python mein `//` se comment likhne ki koshish ki. Isay kaise theek karein?",
          },
          code: `// Restore hunter mana\nprint(250)`,
          options: {
            en: [
              "Keep // and add a semicolon",
              "Replace `//` with `#` (`# Restore hunter mana`)",
              "Wrap the line in parentheses",
              "Use `<--` instead",
            ],
            ur: [
              "// rehne dein aur semicolon lagayein",
              "`//` ki jagah `#` lagayein (`# Restore hunter mana`)",
              "Line ko brackets mein band karein",
              "`<--` ka istemal karein",
            ],
          },
          correct: 1,
          exp: {
            en: "In Python, `//` is the floor division operator, not a comment! Comments must start with `#`.",
            ur: "Python mein `//` floor division ke liye hota hai, comment ke liye nahi! Comment hamesha `#` se shuru hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why is `print(\"Boss Cleared\")` never executing in this snippet?",
            ur: "BUG BREAKER: Is code mein `print(\"Boss Cleared\")` kyun nahi chal raha?",
          },
          code: `# Victory Announcement:\n# print("Boss Cleared")`,
          options: {
            en: [
              "Because `#` at the start of line 2 turned the print statement into a comment",
              "Because Boss Cleared has a space",
              "Because line 1 has a colon",
              "print() cannot run on line 2",
            ],
            ur: [
              "Kyunke line 2 ke shuru mein `#` laga hai jis ne print statement ko comment bana diya hai",
              "Kyunke Boss Cleared mein space hai",
              "Kyunke line 1 mein colon hai",
              "Line 2 par print() nahi chal sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "Removing the `#` before `print(\"Boss Cleared\")` uncomments the code so Python executes it.",
            ur: "Line 2 ke shuru se `#` hatane (uncomment karne) par `print(\"Boss Cleared\")` dobara chalne lagega.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type a Python comment that says `# Shadow`.",
            ur: "ULTIMATE TERMINAL: Python mein `# Shadow` comment type karein.",
          },
          code: `# Write a valid Python comment below:`,
          placeholder: "# Shadow",
          acceptedAnswers: ["# Shadow", "#Shadow", "# shadow", "#shadow"],
          hint: {
            en: "Type: # Shadow",
            ur: "Yeh type karein: # Shadow",
          },
          exp: {
            en: "`# Shadow` starts with `#`, making it a valid Python comment for code documentation.",
            ur: "`# Shadow` hash `#` se shuru hota hai jo Python mein bilkul durust comment hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 4 — Variables and Memory Storage (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 4,
      gateRank: "D-Rank",
      enemyName: "MEMORY SPECTER",
      topic: {
        en: "Level 4 — Variables and Memory Storage",
        ur: "Level 4 — Variables aur Memory Storage",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What value is printed after storing `\"Igris\"` in the variable `shadow`?",
            ur: "Variable `shadow` mein `\"Igris\"` save karne ke baad print karne par kya aayega?",
          },
          code: `shadow = "Igris"\nprint(shadow)`,
          options: {
            en: ["shadow", "Igris", '"shadow"', "NameError"],
            ur: ["shadow", "Igris", '"shadow"', "NameError"],
          },
          correct: 1,
          exp: {
            en: "`print(shadow)` without quotes looks up the value stored inside the variable `shadow`, which is `Igris`.",
            ur: "Baghair quotes ke `print(shadow)` likhne se variable ke andar rakhi value `Igris` print hoti hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Which operator assigns a value to a variable in Python?",
            ur: "Python mein kisi variable ko value dene (assign karne) ke liye kaunsa operator use hota hai?",
          },
          code: `mana = 150`,
          options: {
            en: ["=", "==", "->", ":="],
            ur: ["=", "==", "->", ":="],
          },
          correct: 0,
          exp: {
            en: "A single equals sign `=` is the assignment operator that stores the right-hand value (`150`) into the left-hand variable (`mana`).",
            ur: "Ek barabar ka nishan `=` assignment operator kehlata hai jo `150` ko `mana` variable mein store karta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this code print the word `hp` instead of the number `100`?",
            ur: "BUG BREAKER: Yeh code number `100` ke bajaye lafz `hp` kyun print kar raha hai?",
          },
          code: `hp = 100\nprint("hp")`,
          options: {
            en: [
              "hp cannot store 100",
              "Putting quotes around `\"hp\"` prints the literal text instead of the variable `hp`",
              "Line 1 needs let or var",
              "100 must be in quotes",
            ],
            ur: [
              "hp mein 100 store nahi ho sakta",
              "`\"hp\"` ke gird quotes lagane se variable ki value ke bajaye lafz `hp` print ho raha hai",
              "Line 1 mein let ya var lagana zaroori hai",
              "100 ko quotes mein hona chahiye",
            ],
          },
          correct: 1,
          exp: {
            en: "To print a variable's value, pass the variable name without quotes: `print(hp)` outputs `100`.",
            ur: "Variable ki value print karne ke liye quotes nahi lagate: `print(hp)` likhne se `100` print hoga.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this Python code throw a `NameError: name 'level' is not defined`?",
            ur: "BUG BREAKER: Is code mein `NameError: name 'level' is not defined` kyun aa raha hai?",
          },
          code: `print(level)\nlevel = 5`,
          options: {
            en: [
              "`level` is printed on line 1 before it is assigned on line 2",
              "level is a reserved keyword",
              "5 is too small",
              "print() cannot display numbers",
            ],
            ur: [
              "`level` ko line 2 mein banane se pehle hi line 1 par print kiya ja raha hai",
              "level Python ka reserved keyword hai",
              "5 bohot chhota number hai",
              "print() numbers nahi dikha sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "Python executes code top-to-bottom. A variable must be assigned a value before you can read or print it.",
            ur: "Python code upar se neeche line-by-line chalta hai. Variable ko istemal karne se pehle usay value dena zaroori hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Create a variable named `xp` and assign it the value `50`.",
            ur: "ULTIMATE TERMINAL: `xp` naam ka variable banayein aur usay `50` value dein.",
          },
          code: `# Store 50 in variable xp:`,
          placeholder: "xp = 50",
          acceptedAnswers: ["xp = 50", "xp=50"],
          hint: {
            en: "Type: xp = 50",
            ur: "Yeh type karein: xp = 50",
          },
          exp: {
            en: "`xp = 50` creates the variable `xp` in memory and stores the integer `50` inside it.",
            ur: "`xp = 50` memory mein `xp` variable bana kar uske andar `50` mehfooz kar deta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 5 — Updating Variables and Math Operations (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 5,
      gateRank: "C-Rank",
      enemyName: "ARITHMETIC GOLEM",
      topic: {
        en: "Level 5 — Updating Variables and Mathematical Operations",
        ur: "Level 5 — Variables Update Karna aur Hisabi Operations",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What is the final value of `atk` after these two lines execute?",
            ur: "In do lines ke chalne ke baad `atk` ki aakhri value kya hogi?",
          },
          code: `atk = 20\natk = atk + 15\nprint(atk)`,
          options: {
            en: ["20", "15", "35", "2015"],
            ur: ["20", "15", "35", "2015"],
          },
          correct: 2,
          exp: {
            en: "`atk + 15` takes the current value `20`, adds `15` to get `35`, and stores `35` back into `atk`.",
            ur: "`atk + 15` purani value `20` mein `15` jama karke nayi value `35` wapas `atk` mein save kar deta hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What does `dmg *= 3` do when `dmg` starts at `10`?",
            ur: "Agar `dmg` ki value `10` ho to `dmg *= 3` kya karega?",
          },
          code: `dmg = 10\ndmg *= 3\nprint(dmg)`,
          options: {
            en: ["13", "30", "7", "3"],
            ur: ["13", "30", "7", "3"],
          },
          correct: 1,
          exp: {
            en: "`dmg *= 3` is shorthand for `dmg = dmg * 3`, multiplying `10` by `3` to produce `30`.",
            ur: "`dmg *= 3` ka matlab `dmg = dmg * 3` hai, jo `10` ko `3` se zarb (multiply) de kar `30` bana deta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `score` still print `100` instead of `150`?",
            ur: "BUG BREAKER: `score` print karne par `150` ke bajaye abhi bhi `100` kyun aa raha hai?",
          },
          code: `score = 100\nscore + 50\nprint(score)`,
          options: {
            en: [
              "`score + 50` calculates 150 but never assigns it back (`score = score + 50` or `score += 50`)",
              "50 is too small to add",
              "print(score) resets the variable",
              "Plus `+` only works on strings",
            ],
            ur: [
              "`score + 50` ne result wapas `score` mein save nahi kiya (`score = score + 50` ya `score += 50` likhein)",
              "50 jama karne ke liye chhota hai",
              "print(score) variable ko reset kar deta hai",
              "`+` sirf strings par kaam karta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Writing `score + 50` alone discards the result. You must assign the new value back using `score = score + 50` or `score += 50`.",
            ur: "Sirf `score + 50` likhne se variable update nahi hota. Value save karne ke liye `score += 50` ya `score = score + 50` likhna zaroori hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: A Hunter wants to subtract `25` HP from `hp = 100`, but `hp =- 25` sets `hp` to `-25`! What is the correct shorthand?",
            ur: "BUG BREAKER: Hunter `hp = 100` se `25` kam karna chahta hai, magar `hp =- 25` se `hp` `-25` ho gaya! Sahi operator kaunsa hai?",
          },
          code: `hp = 100\nhp =- 25 # Buggy operator order!\nprint(hp)`,
          options: {
            en: [
              "Use `hp -= 25` (minus before equals)",
              "Use `hp -- 25`",
              "Use `hp == -25`",
              "Use `hp /= 25`",
            ],
            ur: [
              "`hp -= 25` istemal karein (minus barabar se pehle)",
              "`hp -- 25` istemal karein",
              "`hp == -25` istemal karein",
              "`hp /= 25` istemal karein",
            ],
          },
          correct: 0,
          exp: {
            en: "`hp =- 25` assigns negative 25 (`hp = -25`). The subtraction assignment operator is `hp -= 25`, which reduces `100` to `75`.",
            ur: "`hp =- 25` variable ko `-25` bana deta hai. Value ghatane ke liye sahi operator `hp -= 25` hai jis se `75` aayega.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Use the `+=` operator to add `10` to the variable `xp`.",
            ur: "ULTIMATE TERMINAL: `+=` operator istemal karte hue `xp` variable mein `10` jama karein.",
          },
          code: `xp = 40\n# Add 10 to xp using +=:`,
          placeholder: "xp += 10",
          acceptedAnswers: ["xp += 10", "xp+=10", "xp = xp + 10", "xp=xp+10"],
          hint: {
            en: "Type: xp += 10",
            ur: "Yeh type karein: xp += 10",
          },
          exp: {
            en: "`xp += 10` cleanly increments `xp` by `10`, raising it from `40` to `50`!",
            ur: "`xp += 10` mojooda `xp` mein `10` jama karke usay `40` se `50` bana deta hai!",
          },
        },
      ],
    }),
  ];

  /* ========================================================================
     5. PYTHON CLASS — LEVELS 6 TO 10 (HANDCRAFTED)
     Distribution: L6(6), L7(6), L8(6), L9(6), L10 Boss(12) = 36 Questions
     ======================================================================== */
  const PYTHON_LEVELS_6_TO_10 = [
    /* ----------------------------------------------------------------------
       PYTHON LEVEL 6 — Variable Naming Rules and Bugs (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 6,
      gateRank: "C-Rank",
      enemyName: "IDENTIFIER HYDRA",
      topic: {
        en: "Level 6 — Variable Naming Rules and Bugs",
        ur: "Level 6 — Variable Naam Rakhne ke Qanoon aur Bugs",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which of the following is a VALID variable name in Python?",
            ur: "In mein se kaunsa Python variable naam bilkul SAHI (valid) hai?",
          },
          code: `# Choose the legal Python identifier:`,
          options: {
            en: ["1st_hunter", "hunter-rank", "shadow_rank_1", " hunter rank"],
            ur: ["1st_hunter", "hunter-rank", "shadow_rank_1", " hunter rank"],
          },
          correct: 2,
          exp: {
            en: "`shadow_rank_1` starts with a letter and uses underscores and digits. Variable names cannot start with a digit or contain hyphens/spaces.",
            ur: "`shadow_rank_1` harf (letter) se shuru hota hai aur underscore istemal karta hai. Variable number se shuru nahi ho sakta aur na us mein `-` ya space aa sakti hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Python variable names are case-sensitive. What does this code output?",
            ur: "Python mein chhote aur bade harf alag mane jate hain (case-sensitive). Iska output kya hoga?",
          },
          code: `mana = 50\nMana = 90\nprint(mana)`,
          options: {
            en: ["50", "90", "140", "NameError"],
            ur: ["50", "90", "140", "NameError"],
          },
          correct: 0,
          exp: {
            en: "`mana` and `Mana` are two completely separate variables in Python. `print(mana)` outputs `50`.",
            ur: "Python mein `mana` aur `Mana` do alag variables hain, is liye `print(mana)` se `50` print hoga.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `2_shadows = 10` cause a SyntaxError in Python?",
            ur: "BUG BREAKER: Python mein `2_shadows = 10` likhne par SyntaxError kyun aata hai?",
          },
          code: `2_shadows = 10\nprint(2_shadows)`,
          options: {
            en: [
              "A variable name cannot start with a number (`2`)",
              "Underscores are forbidden in Python",
              "10 is too small",
              "Variables cannot be plural",
            ],
            ur: [
              "Variable ka naam kisi number (`2`) se shuru nahi ho sakta",
              "Python mein underscore lagana mana hai",
              "10 bohot chhota number hai",
              "Variable jama (plural) nahi ho sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "Python identifiers must start with a letter (`a-z`, `A-Z`) or an underscore (`_`), never a digit. Use `shadows_2 = 10` instead.",
            ur: "Python variable ka naam hamesha letter ya underscore (`_`) se shuru hona chahiye, number se nahi. Sahi naam `shadows_2 = 10` hoga.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `max-hp = 200` fail with `SyntaxError: cannot assign to expression`?",
            ur: "BUG BREAKER: `max-hp = 200` par `SyntaxError` kyun aata hai?",
          },
          code: `max-hp = 200\nprint(max-hp)`,
          options: {
            en: [
              "200 is not an integer",
              "The hyphen `-` is interpreted as subtraction (`max` minus `hp`), not part of the name; use `max_hp`",
              "max is a secret number",
              "Variables cannot have 5 letters",
            ],
            ur: [
              "200 integer nahi hai",
              "Python `-` ko minus (تفریق) samajhta hai; naam jorne ke liye underscore `max_hp` istemal karein",
              "max ek khufiya number hai",
              "Variable mein 5 harf nahi ho sakte",
            ],
          },
          correct: 1,
          exp: {
            en: "Python treats `-` as the subtraction operator. Replace the hyphen with an underscore (`max_hp = 200`) for snake_case naming.",
            ur: "Python `-` ko minus operator manta hai. Variable ke naam mein `_` (underscore) lagayein: `max_hp = 200`.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Fix the broken variable name `my hp` using snake_case and assign `100` to it.",
            ur: "ULTIMATE TERMINAL: Ghalat variable naam `my hp` ko snake_case (`my_hp`) mein theek karke `100` assign karein.",
          },
          code: `# Fix: my hp = 100 using an underscore:`,
          placeholder: "my_hp = 100",
          acceptedAnswers: ["my_hp = 100", "my_hp=100"],
          hint: {
            en: "Type: my_hp = 100",
            ur: "Yeh type karein: my_hp = 100",
          },
          exp: {
            en: "`my_hp = 100` replaces the illegal space with an underscore, following Python's standard snake_case convention.",
            ur: "`my_hp = 100` space ki jagah underscore laga kar Python ka sahi snake_case tariqa istemal karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Fix the case-sensitivity bug by printing the defined variable `hunter_xp`.",
            ur: "ULTIMATE TERMINAL: Define kiye gaye variable `hunter_xp` ko sahi spelling ke sath print karein.",
          },
          code: `hunter_xp = 300\n# Print hunter_xp accurately:`,
          placeholder: "print(hunter_xp)",
          acceptedAnswers: ["print(hunter_xp)"],
          hint: {
            en: "Type: print(hunter_xp)",
            ur: "Yeh type karein: print(hunter_xp)",
          },
          exp: {
            en: "`print(hunter_xp)` matches the exact lowercase identifier declared on line 1.",
            ur: "`print(hunter_xp)` bilkul wohi chhote harfon wala naam istemal karta hai jo line 1 mein banaya gaya hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 7 — Data Types: int, float, str (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 7,
      gateRank: "B-Rank",
      enemyName: "TYPE CHIMERA",
      topic: {
        en: "Level 7 — Data Types (int, float, str)",
        ur: "Level 7 — Data Types (int, float, str)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What is the Python data type of `crit_rate = 2.5`?",
            ur: "Python mein `crit_rate = 2.5` ki data type kya hai?",
          },
          code: `crit_rate = 2.5\nprint(type(crit_rate))`,
          options: {
            en: ["int", "float", "str", "bool"],
            ur: ["int", "float", "str", "bool"],
          },
          correct: 1,
          exp: {
            en: "Numbers with a decimal point like `2.5` have the `float` (floating-point) data type in Python.",
            ur: "Point (ashariya) wale numbers jaise `2.5` ko Python mein `float` kaha jata hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What data type is stored in `gate_level = \"7\"`?",
            ur: "`gate_level = \"7\"` mein kaunsi data type store hai?",
          },
          code: `gate_level = "7"`,
          options: {
            en: ["int", "float", "str", "number"],
            ur: ["int", "float", "str", "number"],
          },
          correct: 2,
          exp: {
            en: "Any value wrapped in quotation marks (`\"7\"`) is a `str` (string), even if the characters inside are digits.",
            ur: "Jo bhi value quotes ke andar likhi jaye (`\"7\"`), woh Python mein `str` (string) hoti hai chahe andar number hi kyun na ho.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `int(\"50\") + 10` work while `\"50\" + 10` fails?",
            ur: "BUG BREAKER: `\"50\" + 10` error deta hai magar `int(\"50\") + 10` kaise kaam karta hai?",
          },
          code: `bonus = "50"\ntotal = int(bonus) + 10\nprint(total)`,
          options: {
            en: [
              "`int(bonus)` converts the string `\"50\"` into the integer `50` so math addition succeeds (`60`)",
              "`int()` deletes the number 10",
              "`int()` turns 10 into a string",
              "It still crashes with a TypeError",
            ],
            ur: [
              "`int(bonus)` string `\"50\"` ko integer `50` mein badal deta hai jis se jama ho kar `60` aata hai",
              "`int()` 10 ko mita deta hai",
              "`int()` 10 ko string bana deta hai",
              "Yeh ab bhi TypeError dega",
            ],
          },
          correct: 0,
          exp: {
            en: "`int(\"50\")` casts the string `\"50\"` into an `int` (`50`), allowing `50 + 10` to evaluate to `60`.",
            ur: "`int(\"50\")` string ko asali number (`int`) mein tabdeel kar deta hai jis ke baad `50 + 10 = 60` ho jata hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: What is the data type of `result = 10 / 2` in Python 3?",
            ur: "BUG BREAKER: Python 3 mein `result = 10 / 2` ka natija kis data type mein aata hai?",
          },
          code: `result = 10 / 2\nprint(result)`,
          options: {
            en: [
              "`str` because `/` creates text",
              "`float` (`5.0`) because standard division `/` in Python 3 always returns a float",
              "`int` (`5`) because 10 is divisible by 2",
              "SyntaxError",
            ],
            ur: [
              "`str` kyunke `/` text banata hai",
              "`float` (`5.0`) kyunke Python 3 mein `/` division hamesha float return karti hai",
              "`int` (`5`) kyunke 10 poora taqseem hota hai",
              "SyntaxError",
            ],
          },
          correct: 1,
          exp: {
            en: "In Python 3, single-slash division `/` always returns a `float` (`5.0`). Floor division `//` returns an `int` (`5`).",
            ur: "Python 3 mein `/` se taqseem karne par hamesha `float` (`5.0`) milta hai. Integer ke liye `//` use hota hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the Python expression to check the data type of variable `mana` using `type()`.",
            ur: "ULTIMATE TERMINAL: `type()` function istemal karke variable `mana` ki data type check karne ka code likhein.",
          },
          code: `mana = 250\n# Check the type of mana:`,
          placeholder: "type(mana)",
          acceptedAnswers: ["type(mana)", "print(type(mana))"],
          hint: {
            en: "Type: type(mana)",
            ur: "Yeh type karein: type(mana)",
          },
          exp: {
            en: "`type(mana)` returns `<class 'int'>`, identifying `mana` as an integer.",
            ur: "`type(mana)` batata hai ke `mana` variable ki data type `int` (integer) hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Convert the string variable `dmg` into an integer using `int()`.",
            ur: "ULTIMATE TERMINAL: String variable `dmg` ko `int()` ke zariye integer mein tabdeel karein.",
          },
          code: `dmg = "99"\n# Convert dmg to an integer:`,
          placeholder: "int(dmg)",
          acceptedAnswers: ["int(dmg)", "print(int(dmg))", "dmg = int(dmg)"],
          hint: {
            en: "Type: int(dmg)",
            ur: "Yeh type karein: int(dmg)",
          },
          exp: {
            en: "`int(dmg)` converts the string `\"99\"` into the integer `99` for combat calculations.",
            ur: "`int(dmg)` string `\"99\"` ko hisab kitab ke liye integer `99` mein badal deta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 8 — Booleans and Comparisons: True / False (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 8,
      gateRank: "B-Rank",
      enemyName: "BOOLEAN REAPER",
      topic: {
        en: "Level 8 — Booleans and Comparisons (True / False)",
        ur: "Level 8 — Booleans aur Muqabla Operators (True / False)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "How are Boolean truth values written in Python?",
            ur: "Python mein Boolean values (sach aur jhoot) kaise likhi jati hain?",
          },
          code: `is_awakened = True\nis_defeated = False`,
          options: {
            en: [
              "True and False (capital first letters)",
              "true and false (all lowercase)",
              "TRUE and FALSE (all uppercase)",
              "yes and no",
            ],
            ur: [
              "True aur False (pehla harf capital)",
              "true aur false (sab chhote harf)",
              "TRUE aur FALSE (sab bade harf)",
              "yes aur no",
            ],
          },
          correct: 0,
          exp: {
            en: "In Python, Boolean keywords must be capitalized: `True` and `False`.",
            ur: "Python mein Boolean values ka pehla harf hamesha capital hota hai: `True` aur `False`.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will `print(80 >= 80)` output to the console?",
            ur: "Console par `print(80 >= 80)` kya output dega?",
          },
          code: `xp = 80\nprint(xp >= 80)`,
          options: {
            en: ["False", "True", "80", "Error"],
            ur: ["False", "True", "80", "Error"],
          },
          correct: 1,
          exp: {
            en: "`>=` means greater than OR equal to. Since `80` is equal to `80`, the comparison evaluates to `True`.",
            ur: "`>=` ka matlab bada ya barabar hai. Kyunke `80` aur `80` barabar hain, is liye jawab `True` aayega.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `alive = true` raise a `NameError: name 'true' is not defined` in Python?",
            ur: "BUG BREAKER: Python mein `alive = true` likhne par `NameError` kyun aata hai?",
          },
          code: `alive = true\nprint(alive)`,
          options: {
            en: [
              "Lowercase `true` is not recognized in Python; it must be capitalized as `True`",
              "Booleans must be inside quotes",
              "alive is a reserved keyword",
              "Use 100 instead of true",
            ],
            ur: [
              "Python mein chhote `t` wala `true` nahi chalta; capital `T` ke sath `True` likhna zaroori hai",
              "Boolean ko quotes mein rakhna parta hai",
              "alive Python ka keyword hai",
              "true ki jagah 100 likhein",
            ],
          },
          correct: 0,
          exp: {
            en: "Unlike JavaScript or C++, Python requires a capital `T` in `True` and a capital `F` in `False`.",
            ur: "JavaScript aur C++ ke baraks, Python mein `True` ka `T` aur `False` ka `F` capital likhna lazmi hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Which operator checks if two values are EQUAL, instead of assigning a value?",
            ur: "BUG BREAKER: Do values barabar hain ya nahi, yeh check karne ke liye kaunsa operator lagta hai?",
          },
          code: `rank = "S"\n# Check if rank equals "S"\nprint(rank == "S")`,
          options: {
            en: [
              "`=` (single equals)",
              "`==` (double equals comparison operator)",
              "`!=` (not equal)",
              "`+=` (plus equals)",
            ],
            ur: [
              "`=` (ek barabar)",
              "`==` (do barabar wala comparison operator)",
              "`!=` (barabar nahi)",
              "`+=` (jama barabar)",
            ],
          },
          correct: 1,
          exp: {
            en: "`=` assigns a value to a variable, whereas `==` compares two values and returns `True` or `False`.",
            ur: "`=` value save karne ke liye hota hai, jabke `==` do values ka muqabla karke `True` ya `False` deta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Assign the Python boolean value for truth (`True`) to variable `boss_ready`.",
            ur: "ULTIMATE TERMINAL: Variable `boss_ready` ko Python ki sachai wali Boolean value (`True`) dein.",
          },
          code: `# Set boss_ready to True:`,
          placeholder: "boss_ready = True",
          acceptedAnswers: ["boss_ready = True", "boss_ready=True"],
          hint: {
            en: "Type: boss_ready = True",
            ur: "Yeh type karein: boss_ready = True",
          },
          exp: {
            en: "`boss_ready = True` stores the capitalized Python boolean `True` into `boss_ready`.",
            ur: "`boss_ready = True` variable mein Python ki sahi Boolean value `True` save karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the comparison expression to check if `hp` is equal to `100`.",
            ur: "ULTIMATE TERMINAL: Check karein ke `hp` barabar hai `100` ke (`hp == 100`).",
          },
          code: `hp = 100\n# Type equality check:`,
          placeholder: "hp == 100",
          acceptedAnswers: ["hp == 100", "hp==100", "print(hp == 100)"],
          hint: {
            en: "Type: hp == 100",
            ur: "Yeh type karein: hp == 100",
          },
          exp: {
            en: "`hp == 100` uses the equality operator `==` and evaluates to `True`.",
            ur: "`hp == 100` double equals `==` se muqabla karke `True` return karta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 9 — Conditional Logic: if / else (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 9,
      gateRank: "A-Rank",
      enemyName: "LOGIC ARCHLICH",
      topic: {
        en: "Level 9 — Conditional Logic (if / else)",
        ur: "Level 9 — Shartiya Logic (if / else)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What will this Python `if / else` block print when `xp = 200`?",
            ur: "Jab `xp = 200` ho to yeh Python `if / else` code kya print karega?",
          },
          code: `xp = 200\nif xp >= 150:\n    print("C-Rank")\nelse:\n    print("E-Rank")`,
          options: {
            en: ["C-Rank", "E-Rank", "Both", "Nothing"],
            ur: ["C-Rank", "E-Rank", "Dono", "Kuch nahi"],
          },
          correct: 0,
          exp: {
            en: "Since `200 >= 150` is `True`, Python runs the `if` branch and prints `C-Rank`, skipping the `else` block.",
            ur: "Kyunke `200 >= 150` sach (`True`) hai, is liye `if` wala hissa chalega aur `C-Rank` print hoga.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Which keyword is used in Python for 'else if' when checking multiple conditions?",
            ur: "Python mein ek se zyada shartein check karne ke liye 'else if' ki jagah kaunsa keyword lagta hai?",
          },
          code: `if rank == "S":\n    print("Monarch")\nelif rank == "A":\n    print("Hunter")`,
          options: {
            en: ["elseif", "elif", "else if", "when"],
            ur: ["elseif", "elif", "else if", "when"],
          },
          correct: 1,
          exp: {
            en: "Python shortens 'else if' to the 4-letter keyword `elif`.",
            ur: "Python mein 'else if' ko mukhtasir karke `elif` likha jata hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this `if` statement fail with a SyntaxError?",
            ur: "BUG BREAKER: Is `if` statement mein SyntaxError kyun aa raha hai?",
          },
          code: `hp = 50\nif hp > 0\n    print("Alive")`,
          options: {
            en: [
              "Missing colon `:` at the end of `if hp > 0:`",
              "hp > 0 must be in square brackets",
              "print must not be indented",
              "50 is too small",
            ],
            ur: [
              "`if hp > 0` ke aakhir mein colon `:` lagana bhool gaye hain (`if hp > 0:`)",
              "hp > 0 ko square brackets mein hona chahiye",
              "print ke aage space nahi honi chahiye",
              "50 chhota number hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Every `if`, `elif`, and `else` header in Python must end with a colon `:`.",
            ur: "Python mein `if`, `elif`, aur `else` wali line ke aakhir mein colon `:` lagana lazmi hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does Python raise an `IndentationError` on line 3?",
            ur: "BUG BREAKER: Python line 3 par `IndentationError` kyun de raha hai?",
          },
          code: `mana = 100\nif mana >= 50:\nprint("Cast Shadow Slash")`,
          options: {
            en: [
              "Line 3 is not indented (needs 4 spaces inside the `if` block)",
              "mana cannot be 100",
              "Missing semicolon on line 3",
              "if must be capitalized",
            ],
            ur: [
              "Line 3 mein indentation (shuru ki 4 spaces) nahi di gayi",
              "mana 100 nahi ho sakta",
              "Line 3 par semicolon nahi hai",
              "if capital hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "Python uses indentation (4 spaces) to define code blocks inside `if` statements.",
            ur: "Python mein `if` ke andar wale code ko 4 spaces (indentation) de kar aage likhna zaroori hota hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the Python `if` header to check if `hp > 0` (remember the colon!).",
            ur: "ULTIMATE TERMINAL: Check karne ke liye ke `hp > 0` hai, Python ki `if` line colon `:` سمیت type karein.",
          },
          code: `# Write the if condition header for hp > 0:`,
          placeholder: "if hp > 0:",
          acceptedAnswers: ["if hp > 0:", "if(hp>0):", "if (hp > 0):"],
          hint: {
            en: "Type: if hp > 0:",
            ur: "Yeh type karein: if hp > 0:",
          },
          exp: {
            en: "`if hp > 0:` checks whether `hp` is positive and ends with the mandatory Python colon `:`.",
            ur: "`if hp > 0:` check karta hai ke `hp` zero se zyada hai aur aakhir mein zaroori colon `:` lagata hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the `else:` header that catches all remaining cases in a Python conditional.",
            ur: "ULTIMATE TERMINAL: `if` ke baad baki tamam suraton ke liye Python ka `else:` header type karein.",
          },
          code: `if xp >= 500:\n    print("S-Rank")\n# Type the else header below:`,
          placeholder: "else:",
          acceptedAnswers: ["else:"],
          hint: {
            en: "Type: else:",
            ur: "Yeh type karein: else:",
          },
          exp: {
            en: "`else:` (followed by a colon) executes whenever the preceding `if` and `elif` conditions are `False`.",
            ur: "`else:` tab chalta hai jab upar wali `if` ki shart ghalat (`False`) sabit ho.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       PYTHON LEVEL 10 — S-RANK BOSS FIGHT: S-RANK SYNTAX OVERLORD: IG-PY
       12-Question Boss Gauntlet | 15s Timer | All 3 Attack Types
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 10,
      gateRank: "S-Rank BOSS",
      enemyName: "S-RANK SYNTAX OVERLORD: IG-PY",
      topic: {
        en: "Level 10 — S-RANK BOSS GAUNTLET: IG-PY",
        ur: "Level 10 — S-RANK BOSS MUQABLA: IG-PY",
      },
      isBoss: true,
      timer: 15,
      bossTaunts: [
        {
          en: "IG-PY: 'Draw your Serpent Katana, Hunter! One indentation flaw and your code perishes!'",
          ur: "IG-PY: 'Apni Serpent Katana nikalo Hunter! Ek chhoti si ghalti aur tumhara code khatam!'",
        },
        {
          en: "IG-PY: 'My Crimson Syntax Barrier deflects all uncalibrated types!'",
          ur: "IG-PY: 'Mera Crimson Syntax Barrier har kachay code ko rok deta hai!'",
        },
        {
          en: "IG-PY: 'Show me the true power of the Shadow Necromancer's terminal!'",
          ur: "IG-PY: 'Mujhe Shadow Necromancer ke terminal ki asali taqat dikhao!'",
        },
      ],
      victoryDialogue: {
        en: "IG-PY: 'My blood-red armor shatters... I kneel before the Shadow Monarch of Python. Speak the word: ARISE!'",
        ur: "IG-PY: 'Mera zirah toot gaya... Main Python ke Shadow Monarch ke aage jhukta hoon. Hukm dein: ARISE!'",
      },
      defeatDialogue: {
        en: "IG-PY: 'Your Python mastery is incomplete, Hunter. Return when your logic is sharp enough to cleave my core!'",
        ur: "IG-PY: 'Tumhari Python abhi adhoori hai Hunter! Apni logic tez karke dobara maidan mein aao!'",
      },
      questions: [
        {
          attackType: "light",
          bossTaunt: {
            en: "IG-PY: 'Strike 1! Can you read basic output under Red Gate pressure?'",
            ur: "IG-PY: 'Pehla War! Kya tum Red Gate ke dabao mein sahi output pehchan sakte ho?'",
          },
          q: {
            en: "BOSS STRIKE 1/12: What will this Python code output?",
            ur: "BOSS STRIKE 1/12: Yeh Python code kya output dega?",
          },
          code: `boss = "IG-PY"\nprint("Target: " + boss)`,
          options: {
            en: ["Target: IG-PY", "Target: boss", "Target:+boss", "SyntaxError"],
            ur: ["Target: IG-PY", "Target: boss", "Target:+boss", "SyntaxError"],
          },
          correct: 0,
          exp: {
            en: "String concatenation joins `\"Target: \"` with the value of `boss` (`\"IG-PY\"`), producing `Target: IG-PY`.",
            ur: "`+` operator `\"Target: \"` aur `boss` ki value (`\"IG-PY\"`) ko jor kar `Target: IG-PY` print karta hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "IG-PY: 'Strike 2! Shatter my corrupted string quote barrier!'",
            ur: "IG-PY: 'Doosra War! Mere toote hue quotes ka bug pehchano!'",
          },
          q: {
            en: "BOSS STRIKE 2/12 — BUG BREAKER: Fix the broken print statement!",
            ur: "BOSS STRIKE 2/12 — BUG BREAKER: Is toote hue print statement ko theek karein!",
          },
          code: `# Corrupted Boss Spell\nprint("Red Gate Open)`,
          options: {
            en: [
              'Add the missing closing double quote: `print("Red Gate Open")`',
              "Remove the opening parenthesis",
              "Change print to console.log",
              "Replace Red with 100",
            ],
            ur: [
              'Aakhir mein missing double quote lagayein: `print("Red Gate Open")`',
              "Shuru ki bracket hata dein",
              "print ko console.log bana dein",
              "Red ki jagah 100 likhein",
            ],
          },
          correct: 0,
          exp: {
            en: "The string literal was missing its closing quotation mark `\"` before the closing parenthesis `)`.",
            ur: "String ke aakhir mein band karne wala quote `\"` chhoot gaya tha.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "IG-PY: 'Strike 3! Do my Decoy Comments deceive your eyes?'",
            ur: "IG-PY: 'Teesra War! Kya mere Decoy Comments tumhari aankhon ko dhoka de sakte hain?'",
          },
          q: {
            en: "BOSS STRIKE 3/12: What is the final value of `dmg` after this code runs?",
            ur: "BOSS STRIKE 3/12: Is code ke chalne ke baad `dmg` ki aakhri value kya hogi?",
          },
          code: `dmg = 40\n# dmg = 999\ndmg += 20\nprint(dmg)`,
          options: {
            en: ["40", "60", "999", "1019"],
            ur: ["40", "60", "999", "1019"],
          },
          correct: 1,
          exp: {
            en: "Line 2 (`# dmg = 999`) is a comment and is ignored. `dmg` starts at `40` and `dmg += 20` updates it to `60`.",
            ur: "Line 2 (`# dmg = 999`) comment hone ki wajah se ignore ho jati hai. `40 + 20` se jawab `60` aata hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "IG-PY: 'Strike 4! My cursed identifier traps careless Hunters!'",
            ur: "IG-PY: 'Chautha War! Mera ghalat variable naam laparwah Hunters ko phansa deta hai!'",
          },
          q: {
            en: "BOSS STRIKE 4/12 — BUG BREAKER: Which line contains an INVALID Python variable name?",
            ur: "BOSS STRIKE 4/12 — BUG BREAKER: Kis line mein Python variable ka naam GHALAT hai?",
          },
          code: `shadow_1 = "Igris"\n1_shadow = "Tank"\nmax_mana = 500`,
          options: {
            en: [
              "Line 1 (`shadow_1`)",
              "Line 2 (`1_shadow` starts with a digit)",
              "Line 3 (`max_mana`)",
              "All three lines are valid",
            ],
            ur: [
              "Line 1 (`shadow_1`)",
              "Line 2 (`1_shadow` number se shuru ho raha hai)",
              "Line 3 (`max_mana`)",
              "Teeno lines sahi hain",
            ],
          },
          correct: 1,
          exp: {
            en: "`1_shadow` is invalid because Python variable names can never begin with a number.",
            ur: "`1_shadow` ghalat hai kyunke Python mein variable ka naam kabhi number se shuru nahi ho sakta.",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "IG-PY: 'Strike 5! Channel your live code to initialize the Monarch's power!'",
            ur: "IG-PY: 'Panchwan War! Live code likh kar Monarch ki power initialize karo!'",
          },
          q: {
            en: "BOSS STRIKE 5/12 — ULTIMATE: Create variable `power` and set it equal to `900`.",
            ur: "BOSS STRIKE 5/12 — ULTIMATE: `power` naam ka variable banayein aur usay `900` value dein.",
          },
          code: `# Assign 900 to variable power:`,
          placeholder: "power = 900",
          acceptedAnswers: ["power = 900", "power=900"],
          hint: {
            en: "Type: power = 900",
            ur: "Yeh type karein: power = 900",
          },
          exp: {
            en: "DIRECT HIT! `power = 900` binds the integer `900` to `power`, piercing IG-PY's outer guard!",
            ur: "ZABARDAST WAR! `power = 900` ne integer `900` save karke IG-PY ka difa tod diya!",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "IG-PY: 'Strike 6! Distinguish your types or suffer a TypeError!'",
            ur: "IG-PY: 'Chhata War! Data types pehchano warna TypeError ke liye tayyar raho!'",
          },
          q: {
            en: "BOSS STRIKE 6/12: What are the data types of `a = 15`, `b = 15.0`, and `c = \"15\"` in order?",
            ur: "BOSS STRIKE 6/12: `a = 15`, `b = 15.0`, aur `c = \"15\"` ki tarteeb-waar data types kya hain?",
          },
          code: `a = 15\nb = 15.0\nc = "15"`,
          options: {
            en: [
              "int, float, str",
              "float, int, str",
              "int, int, str",
              "str, float, int",
            ],
            ur: [
              "int, float, str",
              "float, int, str",
              "int, int, str",
              "str, float, int",
            ],
          },
          correct: 0,
          exp: {
            en: "`15` is a whole number (`int`), `15.0` has a decimal (`float`), and `\"15\"` is in quotes (`str`).",
            ur: "`15` poora number (`int`) hai, `15.0` point wala (`float`) hai, aur `\"15\"` quotes mein (`str`) hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "IG-PY: 'Strike 7! Why did your combo multiplier fail to pierce my armor?'",
            ur: "IG-PY: 'Satwan War! Tumhara combo multiplier mere armor ko kyun nahi tod saka?'",
          },
          q: {
            en: "BOSS STRIKE 7/12 — BUG BREAKER: Why does `print(atk * 2)` print `5050` instead of `100`?",
            ur: "BOSS STRIKE 7/12 — BUG BREAKER: `print(atk * 2)` se `100` ke bajaye `5050` kyun print ho raha hai?",
          },
          code: `atk = "50"\nprint(atk * 2)`,
          options: {
            en: [
              "Because `atk` is a string `\"50\"`, so `* 2` repeats the text twice (`\"5050\"`); change `atk = 50` or use `int(atk) * 2`",
              "Because `*` means addition in Python",
              "Because 50 * 2 is 5050 in math",
              "Because print() doubles strings automatically",
            ],
            ur: [
              "Kyunke `atk` ek string `\"50\"` hai aur `* 2` string ko do dafa dohrata hai (`\"5050\"`); `atk = 50` ya `int(atk) * 2` karein",
              "Kyunke Python mein `*` ka matlab jama hai",
              "Kyunke hisab mein 50 * 2 ka jawab 5050 hota hai",
              "Kyunke print() string ko double kar deta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Multiplying a string by `2` in Python repeats the string (`\"50\" * 2` -> `\"5050\"`). Use an `int` (`atk = 50`) for mathematical multiplication.",
            ur: "String ko `2` se multiply karne par Python us text ko do dafa likh deta hai (`\"5050\"`). Hisabi zarb ke liye `atk = 50` (integer) rakhein.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "IG-PY: 'Strike 8! Test your boolean judgment against my shadow blade!'",
            ur: "IG-PY: 'Aathwan War! Meri shadow talwar ke samne apni Boolean logic aazmao!'",
          },
          q: {
            en: "BOSS STRIKE 8/12: What does `print(boss_hp != 0)` output when `boss_hp = 250`?",
            ur: "BOSS STRIKE 8/12: Jab `boss_hp = 250` ho to `print(boss_hp != 0)` kya print karega?",
          },
          code: `boss_hp = 250\nprint(boss_hp != 0)`,
          options: {
            en: ["True", "False", "250", "0"],
            ur: ["True", "False", "250", "0"],
          },
          correct: 0,
          exp: {
            en: "`!=` means 'not equal to'. Since `250` is not equal to `0`, the expression evaluates to `True`.",
            ur: "`!=` ka matlab hai 'barabar nahi'. Kyunke `250` zero ke barabar nahi hai, jawab `True` aayega.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "IG-PY: 'Strike 9! Your conditional logic is fracturing!'",
            ur: "IG-PY: 'Nawan War! Tumhari conditional logic mein darar par rahi hai!'",
          },
          q: {
            en: "BOSS STRIKE 9/12 — BUG BREAKER: Why does `if streak = 3:` cause a SyntaxError?",
            ur: "BOSS STRIKE 9/12 — BUG BREAKER: `if streak = 3:` likhne par SyntaxError kyun aata hai?",
          },
          code: `streak = 3\nif streak = 3:\n    print("Awakened!")`,
          options: {
            en: [
              "Inside `if`, you must use the comparison operator `==` (`if streak == 3:`), not the assignment operator `=`",
              "3 must be a string",
              "Colon `:` is not allowed after 3",
              "streak must be capitalized",
            ],
            ur: [
              "`if` condition mein muqabla karne ke liye `==` lagta hai (`if streak == 3:`), single `=` nahi",
              "3 ko string hona chahiye",
              "3 ke baad colon `:` mana hai",
              "streak capital hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "Conditions inside `if` require `==` to test equality (`if streak == 3:`). Single `=` is only for variable assignment.",
            ur: "`if` ki shart mein barabari check karne ke liye `==` istemal hota hai (`if streak == 3:`).",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "IG-PY: 'Strike 10! Trace every branch of my S-Rank decision matrix!'",
            ur: "IG-PY: 'Daswan War! Mere S-Rank decision matrix ka sahi rasta pehchano!'",
          },
          q: {
            en: "BOSS STRIKE 10/12: What will this `if / elif / else` chain output?",
            ur: "BOSS STRIKE 10/12: Yeh `if / elif / else` code kya output dega?",
          },
          code: `xp = 350\nif xp >= 500:\n    print("S-Rank")\nelif xp >= 300:\n    print("A-Rank")\nelse:\n    print("C-Rank")`,
          options: {
            en: ["S-Rank", "A-Rank", "C-Rank", "S-Rank and A-Rank"],
            ur: ["S-Rank", "A-Rank", "C-Rank", "S-Rank aur A-Rank"],
          },
          correct: 1,
          exp: {
            en: "`350 >= 500` is `False`, so Python checks `elif xp >= 300:`, which is `True`, printing `A-Rank`.",
            ur: "`350 >= 500` ghalat hai, lekin agla `elif xp >= 300:` sach (`True`) hai, is liye `A-Rank` print hoga.",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "IG-PY: 'Strike 11! My armor is cracking! Can you channel a critical strike in live code?'",
            ur: "IG-PY: 'Gyarhwan War! Mera armor toot raha hai! Kya tum live code se critical waar kar sakte ho?'",
          },
          q: {
            en: "BOSS STRIKE 11/12 — ULTIMATE: Multiply `crit` by `2` using `*=` to break IG-PY's core shield!",
            ur: "BOSS STRIKE 11/12 — ULTIMATE: IG-PY ki shield todne ke liye `*=` operator se `crit` ko `2` se multiply karein!",
          },
          code: `crit = 250\n# Double crit using *=:`,
          placeholder: "crit *= 2",
          acceptedAnswers: ["crit *= 2", "crit*=2", "crit = crit * 2", "crit=crit*2"],
          hint: {
            en: "Type: crit *= 2",
            ur: "Yeh type karein: crit *= 2",
          },
          exp: {
            en: "CRITICAL BREACH! `crit *= 2` doubles your strike power to `500`, shattering IG-PY's shield!",
            ur: "SHANDAAR STRIKE! `crit *= 2` aapki taqat ko dugna (`500`) karke IG-PY ki shield pash-pash kar deta hai!",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "IG-PY: 'FINAL STRIKE 12/12! Impossible... Speak the Monarch's command if you dare!'",
            ur: "IG-PY: 'AAKHRI WAR 12/12! Namumkin... Agar himmat hai to Shadow Monarch ka aakhri hukm likho!'",
          },
          q: {
            en: "🌌 BOSS FINISHER 12/12 — ULTIMATE: Type the Python code to print `\"ARISE\"` and extract IG-PY's Shadow!",
            ur: "🌌 BOSS FINISHER 12/12 — ULTIMATE: IG-PY ka Shadow nikalne ke liye Python mein `print(\"ARISE\")` type karein!",
          },
          code: `# Deliver the Final Shadow Monarch Finisher:`,
          placeholder: 'print("ARISE")',
          acceptedAnswers: [
            'print("ARISE")',
            "print('ARISE')",
            'print("Arise")',
            "print('Arise')",
            'print("arise")',
            "print('arise')",
          ],
          hint: {
            en: 'Type: print("ARISE")',
            ur: 'Yeh type karein: print("ARISE")',
          },
          exp: {
            en: "🌌 S-RANK OVERLORD DEFEATED! `print(\"ARISE\")` cleaves IG-PY's core and awakens Shadow Commander Igris-Py!",
            ur: "🌌 S-RANK OVERLORD SHIKAST KHA GAYA! `print(\"ARISE\")` ne IG-PY ko hara kar Shadow Commander Igris-Py ko jaga diya!",
          },
        },
      ],
    }),
  ];

  const PYTHON_ALL_LEVELS = PYTHON_LEVELS_1_TO_5.concat(PYTHON_LEVELS_6_TO_10);

  /* ========================================================================
     6. JAVASCRIPT CLASS — LEVELS 1 TO 5 (HANDCRAFTED)
     Distribution: L1(3), L2(5), L3(5), L4(5), L5(5) = 23 Questions
     ======================================================================== */
  const JS_LEVELS_1_TO_5 = [
    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 1 — Output and Syntax Basics: console.log() (3 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 1,
      gateRank: "E-Rank",
      enemyName: "CONSOLE DRONE",
      topic: {
        en: "Level 1 — Output and Syntax Basics (console.log)",
        ur: "Level 1 — Output aur Syntax ki Bunyad (console.log)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which JavaScript method prints messages to the developer console?",
            ur: "JavaScript mein console par message print karne ke liye kaunsa method istemal hota hai?",
          },
          code: `// Output "Cyber Assassin" to console\nconsole.log("Cyber Assassin");`,
          options: {
            en: ["console.log()", "print()", "std::cout", "System.out()"],
            ur: ["console.log()", "print()", "std::cout", "System.out()"],
          },
          correct: 0,
          exp: {
            en: "In JavaScript, `console.log()` outputs text, numbers, or variables to the console.",
            ur: "JavaScript mein console par koi bhi text ya value dikhane ke liye `console.log()` istemal hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `consol.log(\"Strike\")` throw a ReferenceError in JavaScript?",
            ur: "BUG BREAKER: JavaScript mein `consol.log(\"Strike\")` likhne par ReferenceError kyun aata hai?",
          },
          code: `// Broken JS output statement\nconsol.log("Strike");`,
          options: {
            en: [
              "`console` is misspelled as `consol` (missing the letter `e`)",
              "log must be capitalized as LOG",
              "Double quotes are illegal in JavaScript",
              "Semicolons cause errors in JS",
            ],
            ur: [
              "`console` ki spelling ghalat hai (`consol` mein `e` chhoot gaya hai)",
              "log ko bade harfon mein LOG likhna chahiye",
              "JavaScript mein double quotes mana hain",
              "Semicolon lagane se error aata hai",
            ],
          },
          correct: 0,
          exp: {
            en: "The built-in object is spelled `console` with an `e` at the end: `console.log(\"Strike\");`.",
            ur: "Sahi object ka naam `console` hai (aakhir mein `e` aata hai): `console.log(\"Strike\");`.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the JavaScript command to log `\"Arise\"` to the console.",
            ur: "ULTIMATE TERMINAL: Console par `\"Arise\"` print karne ke liye JavaScript code type karein.",
          },
          code: `// Log "Arise" using console.log:`,
          placeholder: 'console.log("Arise")',
          acceptedAnswers: [
            'console.log("Arise")',
            'console.log("Arise");',
            "console.log('Arise')",
            "console.log('Arise');",
          ],
          hint: {
            en: 'Type: console.log("Arise")',
            ur: 'Yeh type karein: console.log("Arise")',
          },
          exp: {
            en: "`console.log(\"Arise\")` dispatches your Cyber Assassin strike straight to the JavaScript console!",
            ur: "`console.log(\"Arise\")` JavaScript console par Arise print karke aapka waar mukammal karta hai!",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 2 — Strings vs Numbers and Quotes (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 2,
      gateRank: "E-Rank",
      enemyName: "STRING STALKER",
      topic: {
        en: "Level 2 — Strings vs Numbers and Quotes",
        ur: "Level 2 — Strings Bamane Numbers aur Quotes",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What will `console.log(25 + 25)` output compared to `console.log(\"25\" + \"25\")`?",
            ur: "`console.log(25 + 25)` aur `console.log(\"25\" + \"25\")` ke output mein kya farq hoga?",
          },
          code: `console.log(25 + 25);\nconsole.log("25" + "25");`,
          options: {
            en: [
              "First outputs 50, second outputs 2525",
              "Both output 50",
              "Both output 2525",
              "First outputs 2525, second outputs 50",
            ],
            ur: [
              "Pehla 50 dega, doosra 2525 dega",
              "Dono 50 denge",
              "Dono 2525 denge",
              "Pehla 2525 dega, doosra 50 dega",
            ],
          },
          correct: 0,
          exp: {
            en: "`25 + 25` adds two numbers (`50`), while `\"25\" + \"25\"` concatenates two strings (`\"2525\"`).",
            ur: "`25 + 25` do numbers ko jama karke `50` banata hai, jabke `\"25\" + \"25\"` do strings ko jor kar `\"2525\"` deta hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Which quote styles are valid for creating strings in JavaScript?",
            ur: "JavaScript mein string banane ke liye kaunse quotes istemal ho sakte hain?",
          },
          code: `let a = "Double";\nlet b = 'Single';\nlet c = \`Backticks\`;`,
          options: {
            en: [
              "Only double quotes `\" \"`",
              "Single quotes `' '`, double quotes `\" \"`, and backticks `` ` ` ``",
              "Only single quotes `' '`",
              "Square brackets `[ ]`",
            ],
            ur: [
              "Sirf double quotes `\" \"`",
              "Single quotes `' '`, double quotes `\" \"`, aur backticks `` ` ` `` teeno",
              "Sirf single quotes `' '`",
              "Square brackets `[ ]`",
            ],
          },
          correct: 1,
          exp: {
            en: "JavaScript supports single quotes `' '`, double quotes `\" \"`, and template literal backticks `` ` ` ``.",
            ur: "JavaScript mein `' '`, `\" \"`, aur template literals ke liye backticks `` ` ` `` teeno bilkul durust hain.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `console.log(\"100\" + 50)` output `\"10050\"` instead of `150` in JavaScript?",
            ur: "BUG BREAKER: JavaScript mein `console.log(\"100\" + 50)` ka jawab `150` ke bajaye `\"10050\"` kyun aata hai?",
          },
          code: `console.log("100" + 50);`,
          options: {
            en: [
              "Because `\"100\"` is a string in quotes, so `+` converts `50` into a string and joins them (`\"10050\"`); remove quotes around `100` for math",
              "Because JavaScript cannot add numbers",
              "Because 100 + 50 equals 10050",
              "Because 50 is negative",
            ],
            ur: [
              "Kyunke `\"100\"` quotes mein string hai, is liye `+` operator `50` ko bhi string bana kar jor deta hai (`\"10050\"`); hisab ke liye `100 + 50` likhein",
              "Kyunke JavaScript numbers jama nahi kar sakti",
              "Kyunke 100 + 50 ka jawab 10050 hota hai",
              "Kyunke 50 negative hai",
            ],
          },
          correct: 0,
          exp: {
            en: "In JavaScript, if either operand of `+` is a string, JS performs string concatenation. Write `100 + 50` without quotes to get `150`.",
            ur: "JavaScript mein agar `+` ke ek taraf string ho to woh doosre number ko bhi string bana kar jor deta hai. Hisab ke liye quotes hata dein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Fix the unterminated string literal in this JavaScript statement!",
            ur: "BUG BREAKER: Is JavaScript statement mein adhoori string ka bug theek karein!",
          },
          code: `console.log('Shadow Step");`,
          options: {
            en: [
              "Match the opening and closing quotes: `console.log(\"Shadow Step\");` or `console.log('Shadow Step');`",
              "Remove both quotes around Shadow Step",
              "Replace console.log with print",
              "Delete the closing parenthesis",
            ],
            ur: [
              "Shuru aur aakhir ke quotes ek jaise rakhein: `console.log(\"Shadow Step\");` ya `console.log('Shadow Step');`",
              "Dono quotes hata dein",
              "console.log ki jagah print likhein",
              "Aakhri bracket mita dein",
            ],
          },
          correct: 0,
          exp: {
            en: "A string started with a single quote `'` cannot be closed with a double quote `\"`. Both quotes must match.",
            ur: "Jo string single quote `'` se shuru ho usay double quote `\"` se band nahi kar sakte; dono quotes ek jaise hone chahiye.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Log the number `500` (without quotes) using `console.log()`.",
            ur: "ULTIMATE TERMINAL: Baghair quotes ke number `500` ko `console.log()` ke zariye print karein.",
          },
          code: `// Output numeric value 500 to console:`,
          placeholder: "console.log(500)",
          acceptedAnswers: ["console.log(500)", "console.log(500);"],
          hint: {
            en: "Type: console.log(500)",
            ur: "Yeh type karein: console.log(500)",
          },
          exp: {
            en: "`console.log(500)` outputs the number `500` directly without converting it into a string literal.",
            ur: "`console.log(500)` baghair quotes ke seedha number `500` console par print karta hai.",
          },
        },
      ],
    }),

    // ----------------------------------------------------------------------
    // JAVASCRIPT LEVEL 3 — Comments and Code Readability (5 Questions)
    // ----------------------------------------------------------------------
    makeLevel({
      level: 3,
      gateRank: "D-Rank",
      enemyName: "SLASH PHANTOM",
      topic: {
        en: "Level 3 — Comments and Code Readability (// and /* */)",
        ur: "Level 3 — Comments aur Code ki Wazahat (// aur /* */)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which syntax creates a single-line comment in JavaScript?",
            ur: "JavaScript mein single-line comment likhne ke liye kaunsa nishan lagta hai?",
          },
          code: `// Activate Cyber Daggers\nconsole.log("Ready");`,
          options: {
            en: ["// comment", "# comment", "<!-- comment -->", "** comment"],
            ur: ["// comment", "# comment", "<!-- comment -->", "** comment"],
          },
          correct: 0,
          exp: {
            en: "Double forward slashes `//` start a single-line comment in JavaScript.",
            ur: "JavaScript mein ek line ka comment likhne ke liye do slashes `//` istemal hoti hain.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "How do you wrap a multi-line block comment in JavaScript?",
            ur: "JavaScript mein kai lines ka (multi-line) comment kis tarah likha jata hai?",
          },
          code: `/*\n  Multi-line Hunter System Note\n  Ignored by JS Engine\n*/`,
          options: {
            en: [
              "/* comment */",
              "// comment //",
              "### comment ###",
              "''' comment '''",
            ],
            ur: [
              "/* comment */",
              "// comment //",
              "### comment ###",
              "''' comment '''",
            ],
          },
          correct: 0,
          exp: {
            en: "Multi-line comments in JavaScript begin with `/*` and end with `*/`.",
            ur: "JavaScript mein multi-line comment `/*` se shuru hota hai aur `*/` par khatam hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this JavaScript file fail with a SyntaxError on line 1?",
            ur: "BUG BREAKER: Is JavaScript code ki pehli line par SyntaxError kyun aa raha hai?",
          },
          code: `# Set assassin speed\nlet speed = 90;`,
          options: {
            en: [
              "`#` is a Python comment; JavaScript requires `//` (`// Set assassin speed`)",
              "`let` is not allowed in JavaScript",
              "90 must be in quotes",
              "speed is a reserved word",
            ],
            ur: [
              "`#` Python ka comment hai; JavaScript mein `//` lagانا zaroori hai (`// Set assassin speed`)",
              "JavaScript mein `let` mana hai",
              "90 ko quotes mein hona chahiye",
              "speed reserved word hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Standard comments in JavaScript use `//` or `/* */`, not `#`.",
            ur: "JavaScript mein comment ke liye `#` nahi balki `//` ya `/* */` istemal kiya jata hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why is `console.log(\"Strike!\")` completely ignored here?",
            ur: "BUG BREAKER: Yahan `console.log(\"Strike!\")` bilkul kyun nahi chal raha?",
          },
          code: `/* Combat LogStart\nconsole.log("Strike!");`,
          options: {
            en: [
              "The multi-line comment `/*` on line 1 was never closed with `*/`, swallowing line 2",
              "Strike! has an exclamation mark",
              "console.log cannot be used on line 2",
              "Missing var keyword",
            ],
            ur: [
              "Line 1 par shuru hone wala `/*` comment `*/` se band nahi kiya gaya jis ki wajah se line 2 bhi comment ban gayi",
              "Strike! mein exclamation mark hai",
              "Line 2 par console.log nahi chal sakta",
              "var keyword missing hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Every `/*` block comment must be closed with `*/` (`/* Combat LogStart */`), otherwise all following code is commented out.",
            ur: "`/*` se shuru hone wale comment ko `*/` se band karna lazmi hai warna neeche ka sara code comment ban jata hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type a single-line JavaScript comment that says `// Shadow`.",
            ur: "ULTIMATE TERMINAL: JavaScript mein single-line comment `// Shadow` type karein.",
          },
          code: `// Write a single-line JS comment below:`,
          placeholder: "// Shadow",
          acceptedAnswers: ["// Shadow", "//Shadow", "// shadow", "//shadow"],
          hint: {
            en: "Type: // Shadow",
            ur: "Yeh type karein: // Shadow",
          },
          exp: {
            en: "`// Shadow` uses double slashes `//` to create a clean single-line comment in JavaScript.",
            ur: "`// Shadow` do slashes `//` ke sath JavaScript ka bilkul sahi single-line comment hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 4 — Variables and Memory Storage (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 4,
      gateRank: "D-Rank",
      enemyName: "BINDING SPECTER",
      topic: {
        en: "Level 4 — Variables and Memory Storage (let / const)",
        ur: "Level 4 — Variables aur Memory Storage (let / const)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which modern JavaScript keyword declares a variable whose value CAN change later?",
            ur: "JavaScript mein aisa variable banane ke liye jis ki value baad mein BADLI ja sake, kaunsa keyword lagta hai?",
          },
          code: `let mana = 100;\nmana = 150;`,
          options: {
            en: ["let", "const", "fixed", "int"],
            ur: ["let", "const", "fixed", "int"],
          },
          correct: 0,
          exp: {
            en: "`let` declares a block-scoped mutable variable whose value can be reassigned.",
            ur: "`let` se banaya gaya variable baad mein update ya reassign kiya ja sakta hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will `console.log(weapon)` output in this code?",
            ur: "Is code mein `console.log(weapon)` kya output dega?",
          },
          code: `const weapon = "Twin Daggers";\nconsole.log(weapon);`,
          options: {
            en: ["weapon", "Twin Daggers", "undefined", "ReferenceError"],
            ur: ["weapon", "Twin Daggers", "undefined", "ReferenceError"],
          },
          correct: 1,
          exp: {
            en: "`weapon` holds the string `\"Twin Daggers\"`, so `console.log(weapon)` prints `Twin Daggers`.",
            ur: "`weapon` variable mein `\"Twin Daggers\"` store hai, is liye wohi screen par print hoga.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `maxHp = 200` throw `TypeError: Assignment to constant variable`?",
            ur: "BUG BREAKER: `maxHp = 200` par `TypeError: Assignment to constant variable` kyun aata hai?",
          },
          code: `const maxHp = 100;\nmaxHp = 200;`,
          options: {
            en: [
              "`maxHp` was declared with `const`, which cannot be reassigned; use `let maxHp = 100;` instead",
              "200 is too large for JavaScript",
              "Missing quotes around 200",
              "maxHp must be all uppercase",
            ],
            ur: [
              "`maxHp` ko `const` se banaya gaya hai jisay badla nahi ja sakta; iski jagah `let maxHp = 100;` use karein",
              "200 JavaScript ke liye bohot bada hai",
              "200 ke gird quotes nahi hain",
              "maxHp bade harfon mein hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "`const` creates a constant reference that cannot be reassigned. Declare mutable variables with `let`.",
            ur: "`const` ka matlab constant (مستقل) hai. Jis variable ki value badalni ho usay `let` se declare karein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: What does JavaScript log when a `let` variable is declared without a value?",
            ur: "BUG BREAKER: Agar `let` variable ko koi value na di jaye to `console.log(rank)` kya dikhayega?",
          },
          code: `let rank;\nconsole.log(rank);`,
          options: {
            en: [
              "`undefined` (because no value was assigned to `rank` yet)",
              "`0`",
              "`\"rank\"`",
              "`SyntaxError`",
            ],
            ur: [
              "`undefined` (kyunke `rank` ko abhi koi value assign nahi ki gayi)",
              "`0`",
              "`\"rank\"`",
              "`SyntaxError`",
            ],
          },
          correct: 0,
          exp: {
            en: "An uninitialized `let` variable automatically holds the value `undefined` until assigned.",
            ur: "Jab `let` variable ko koi value na di jaye to JavaScript us mein default taur par `undefined` rakhta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Declare a variable `xp` using `let` and assign it `50`.",
            ur: "ULTIMATE TERMINAL: `let` istemal karte hue `xp` variable banayein aur usay `50` value dein.",
          },
          code: `// Declare xp with let and set it to 50:`,
          placeholder: "let xp = 50",
          acceptedAnswers: ["let xp = 50", "let xp = 50;", "let xp=50", "let xp=50;"],
          hint: {
            en: "Type: let xp = 50",
            ur: "Yeh type karein: let xp = 50",
          },
          exp: {
            en: "`let xp = 50` allocates the mutable variable `xp` in memory with the value `50`.",
            ur: "`let xp = 50` memory mein `xp` variable bana kar us mein `50` store kar deta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 5 — Updating Variables and Math Operations (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 5,
      gateRank: "C-Rank",
      enemyName: "VOLTAGE GOLEM",
      topic: {
        en: "Level 5 — Updating Variables and Mathematical Operations",
        ur: "Level 5 — Variables Update Karna aur Hisabi Operations",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What will `console.log(energy)` output after these operations?",
            ur: "In hisabi operations ke baad `console.log(energy)` kya output dega?",
          },
          code: `let energy = 40;\nenergy += 20;\nenergy -= 10;\nconsole.log(energy);`,
          options: {
            en: ["40", "60", "50", "30"],
            ur: ["40", "60", "50", "30"],
          },
          correct: 2,
          exp: {
            en: "`energy` starts at `40`, increases by `20` to `60`, and decreases by `10` to become `50`.",
            ur: "`energy` `40` se shuru ho kar `+20` se `60` hoti hai aur `-10` ke baad `50` reh jati hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What is the value of `combo` after `combo++` executes once?",
            ur: "`combo++` ek dafa chalne ke baad `combo` ki value kya ho jayegi?",
          },
          code: `let combo = 5;\ncombo++;\nconsole.log(combo);`,
          options: {
            en: ["5", "6", "10", "4"],
            ur: ["5", "6", "10", "4"],
          },
          correct: 1,
          exp: {
            en: "The increment operator `++` adds `1` to the variable, updating `combo` from `5` to `6`.",
            ur: "`++` increment operator variable mein `1` ka izafa karta hai, jis se `5` barh kar `6` ho jata hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `dmg` print `100` instead of `300` here?",
            ur: "BUG BREAKER: Yahan `dmg` print karne par `300` ke bajaye `100` kyun aa raha hai?",
          },
          code: `let dmg = 100;\ndmg * 3;\nconsole.log(dmg);`,
          options: {
            en: [
              "`dmg * 3` does not save the result back into `dmg`; use `dmg *= 3;` or `dmg = dmg * 3;`",
              "JavaScript cannot multiply by 3",
              "let prevents math operations",
              "console.log divides by 3",
            ],
            ur: [
              "`dmg * 3` ne natija wapas `dmg` mein save nahi kiya; `dmg *= 3;` ya `dmg = dmg * 3;` likhein",
              "JavaScript 3 se multiply nahi kar sakti",
              "let hisab karne se rokta hai",
              "console.log 3 se divide kar deta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "To update `dmg`, you must assign the result back using `dmg *= 3;` or `dmg = dmg * 3;`.",
            ur: "Variable update karne ke liye `dmg *= 3;` ya `dmg = dmg * 3;` likhna zaroori hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: A Hunter wants `(10 + 5) * 2` to equal `30`, but `10 + 5 * 2` gives `20`! Why?",
            ur: "BUG BREAKER: Hunter `30` hasil karna chahta hai magar `10 + 5 * 2` ka jawab `20` kyun aa raha hai?",
          },
          code: `let crit = 10 + 5 * 2;\nconsole.log(crit); // Outputs 20 instead of 30!`,
          options: {
            en: [
              "Operator precedence (BODMAS) evaluates `5 * 2` (`10`) before `+ 10`; wrap `(10 + 5) * 2` in parentheses",
              "`*` means subtraction in JS",
              "10 is ignored by JavaScript",
              "let rounds numbers down",
            ],
            ur: [
              "BODMAS qanoon ke mutabiq zarb `5 * 2` pehle hota hai; pehle jama karne ke liye brackets `(10 + 5) * 2` lagayein",
              "JS mein `*` ka matlab تفریق hai",
              "JavaScript 10 ko ignore kar raha hai",
              "let number kam kar deta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Multiplication `*` has higher precedence than addition `+`. Use parentheses `(10 + 5) * 2` to evaluate addition first (`30`).",
            ur: "Zarb `*` jama `+` se pehle hal hota hai. Pehle `10 + 5` karne ke liye brackets `(10 + 5) * 2` lagayein.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Use `+=` to add `25` to the variable `xp`.",
            ur: "ULTIMATE TERMINAL: `+=` operator istemal karke `xp` variable mein `25` jama karein.",
          },
          code: `let xp = 75;\n// Add 25 to xp using +=:`,
          placeholder: "xp += 25",
          acceptedAnswers: ["xp += 25", "xp += 25;", "xp+=25", "xp+=25;", "xp = xp + 25", "xp = xp + 25;"],
          hint: {
            en: "Type: xp += 25",
            ur: "Yeh type karein: xp += 25",
          },
          exp: {
            en: "`xp += 25` adds `25` to `75`, updating `xp` to `100`!",
            ur: "`xp += 25` mojooda `75` mein `25` jama karke `xp` ko `100` bana deta hai!",
          },
        },
      ],
    }),
  ];

  /* ========================================================================
     7. JAVASCRIPT CLASS — LEVELS 6 TO 10 (HANDCRAFTED)
     Distribution: L6(6), L7(6), L8(6), L9(6), L10 Boss(12) = 36 Questions
     ======================================================================== */
  const JS_LEVELS_6_TO_10 = [
    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 6 — Variable Naming Rules and Bugs (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 6,
      gateRank: "C-Rank",
      enemyName: "CAMELCASE SHREDDER",
      topic: {
        en: "Level 6 — Variable Naming Rules and Bugs",
        ur: "Level 6 — Variable Naam Rakhne ke Qanoon aur Bugs",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which naming convention is standard for variables in JavaScript?",
            ur: "JavaScript mein variables ka naam rakhne ke liye kaunsa tariqa sab se zyada istemal hota hai?",
          },
          code: `let shadowRank = "S";\nlet maxHeroHp = 100;`,
          options: {
            en: [
              "camelCase (e.g. `shadowRank`)",
              "kebab-case (e.g. `shadow-rank`)",
              "space case (e.g. `shadow rank`)",
              "digit-start (e.g. `1shadowRank`)",
            ],
            ur: [
              "camelCase (maslan `shadowRank`)",
              "kebab-case (maslan `shadow-rank`)",
              "space case (maslan `shadow rank`)",
              "digit-start (maslan `1shadowRank`)",
            ],
          },
          correct: 0,
          exp: {
            en: "JavaScript developers standardly use `camelCase`, where the first word is lowercase and subsequent words are capitalized.",
            ur: "JavaScript mein `camelCase` istemal hota hai jis mein pehla lafz chhota aur agle lafzon ka pehla harf capital hota hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Which special symbols are legally allowed at the start of a JavaScript variable name?",
            ur: "JavaScript variable ke naam ke shuru mein letters ke ilawa kaunse do symbols aa sakte hain?",
          },
          code: `let $mana = 200;\nlet _shadow = "Igris";`,
          options: {
            en: ["`$` and `_`", "`@` and `#`", "`-` and `+`", "`!` and `?`"],
            ur: ["`$` aur `_`", "`@` aur `#`", "`-` aur `+`", "`!` aur `?`"],
          },
          correct: 0,
          exp: {
            en: "JavaScript identifiers can begin with a letter, a dollar sign `$`, or an underscore `_`.",
            ur: "JavaScript variable ka naam letter, dollar sign `$`, ya underscore `_` se shuru ho sakta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `let 9gates = true;` cause a SyntaxError in JavaScript?",
            ur: "BUG BREAKER: JavaScript mein `let 9gates = true;` likhne par SyntaxError kyun aata hai?",
          },
          code: `let 9gates = true;`,
          options: {
            en: [
              "Variable names cannot start with a number (`9`)",
              "true is not a keyword",
              "let cannot store booleans",
              "gates must be uppercase",
            ],
            ur: [
              "Variable ka naam kisi number (`9`) se shuru nahi ho sakta",
              "true koi keyword nahi hai",
              "let mein boolean save nahi ho sakta",
              "gates capital hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "Digits are allowed after the first character (like `gates9`), but never as the first character of an identifier.",
            ur: "Variable ke naam ke shuru mein number nahi aa sakta; البتہ baad mein (`gates9`) aa sakta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `console.log(heroHp)` throw `ReferenceError: heroHp is not defined`?",
            ur: "BUG BREAKER: `console.log(heroHp)` par `ReferenceError: heroHp is not defined` kyun aa raha hai?",
          },
          code: `let herohp = 100;\nconsole.log(heroHp);`,
          options: {
            en: [
              "Case mismatch: declared as lowercase `herohp` on line 1, but logged with capital `H` (`heroHp`) on line 2",
              "100 is not a valid number",
              "let variables cannot be logged",
              "Missing quotes around heroHp",
            ],
            ur: [
              "Chhote/bade harf ka farq: line 1 mein `herohp` hai magar line 2 mein capital `H` (`heroHp`) likha gaya hai",
              "100 sahi number nahi hai",
              "let variable print nahi ho sakta",
              "heroHp ke gird quotes nahi hain",
            ],
          },
          correct: 0,
          exp: {
            en: "JavaScript is strictly case-sensitive: `herohp` and `heroHp` refer to different identifiers.",
            ur: "JavaScript case-sensitive hai: `herohp` aur `heroHp` do alag naam mane jate hain.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Fix the invalid variable declaration `let max-mana = 100` using camelCase (`maxMana`).",
            ur: "ULTIMATE TERMINAL: Ghalat naam `let max-mana = 100` ko camelCase (`let maxMana = 100`) mein theek karein.",
          },
          code: `// Rewrite let max-mana = 100 in camelCase:`,
          placeholder: "let maxMana = 100",
          acceptedAnswers: ["let maxMana = 100", "let maxMana = 100;", "let maxMana=100", "let maxMana=100;"],
          hint: {
            en: "Type: let maxMana = 100",
            ur: "Yeh type karein: let maxMana = 100",
          },
          exp: {
            en: "`let maxMana = 100` removes the illegal hyphen and applies clean JavaScript camelCase.",
            ur: "`let maxMana = 100` ghalat `-` hata kar sahi JavaScript camelCase istemal karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Log the variable `shadowRank` accurately using `console.log()`.",
            ur: "ULTIMATE TERMINAL: Variable `shadowRank` ko `console.log()` ke zariye bilkul sahi spelling mein print karein.",
          },
          code: `let shadowRank = "S";\n// Log shadowRank:`,
          placeholder: "console.log(shadowRank)",
          acceptedAnswers: ["console.log(shadowRank)", "console.log(shadowRank);"],
          hint: {
            en: "Type: console.log(shadowRank)",
            ur: "Yeh type karein: console.log(shadowRank)",
          },
          exp: {
            en: "`console.log(shadowRank)` matches the exact camelCase variable name and outputs `S`.",
            ur: "`console.log(shadowRank)` sahi camelCase variable ko call karke `S` print karta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 7 — Data Types: number, string (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 7,
      gateRank: "B-Rank",
      enemyName: "TYPEOF SPECTER",
      topic: {
        en: "Level 7 — Data Types (number, string)",
        ur: "Level 7 — Data Types (number, string)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What does `typeof 42` return in JavaScript?",
            ur: "JavaScript mein `typeof 42` kya return karta hai?",
          },
          code: `console.log(typeof 42);`,
          options: {
            en: ['"number"', '"int"', '"float"', '"string"'],
            ur: ['"number"', '"int"', '"float"', '"string"'],
          },
          correct: 0,
          exp: {
            en: "In JavaScript, both whole numbers (`42`) and decimals (`42.5`) share the single data type `\"number\"`.",
            ur: "JavaScript mein poore numbers (`42`) aur point wale numbers (`42.5`) dono ki data type `\"number\"` hoti hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What does `typeof \"Vulcan\"` evaluate to in JavaScript?",
            ur: "JavaScript mein `typeof \"Vulcan\"` ka jawab kya aayega?",
          },
          code: `let boss = "Vulcan";\nconsole.log(typeof boss);`,
          options: {
            en: ['"text"', '"string"', '"str"', '"char"'],
            ur: ['"text"', '"string"', '"str"', '"char"'],
          },
          correct: 1,
          exp: {
            en: "Text wrapped in quotes has the type `\"string\"` in JavaScript.",
            ur: "Quotes ke andar likhe gaye text ki data type JavaScript mein `\"string\"` kehlati hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `typeof \"999\"` return `\"string\"` instead of `\"number\"`?",
            ur: "BUG BREAKER: `typeof \"999\"` ka jawab `\"number\"` ke bajaye `\"string\"` kyun aata hai?",
          },
          code: `let dmg = "999";\nconsole.log(typeof dmg);`,
          options: {
            en: [
              "Because `\"999\"` is enclosed in quotation marks, making it a string; use `let dmg = 999;` or `Number(dmg)` for a number",
              "Because 999 is too large to be a number",
              "Because typeof always returns string",
              "Because dmg is a reserved word",
            ],
            ur: [
              "Kyunke `\"999\"` quotes ke andar hai is liye woh string hai; number banane ke liye `let dmg = 999;` ya `Number(dmg)` likhein",
              "Kyunke 999 bohot bada number hai",
              "Kyunke typeof hamesha string deta hai",
              "Kyunke dmg reserved lafz hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Quotation marks turn any digits into a `string`. Remove the quotes (`999`) or convert with `Number(\"999\")`.",
            ur: "Quotes lagane se digits bhi `string` ban jate hain. Quotes hata dein ya `Number(\"999\")` istemal karein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: What happens when you multiply a non-numeric string `\"Hunter\" * 5` in JavaScript?",
            ur: "BUG BREAKER: JavaScript mein `\"Hunter\" * 5` karne par kya result milta hai?",
          },
          code: `let result = "Hunter" * 5;\nconsole.log(result);`,
          options: {
            en: [
              "`NaN` (Not-a-Number), because `\"Hunter\"` cannot be converted into a valid number for multiplication",
              "`\"HunterHunterHunterHunterHunter\"`",
              "`5`",
              "`0`",
            ],
            ur: [
              "`NaN` (Not-a-Number), kyunke lafz `\"Hunter\"` ko hisabi number mein tabdeel nahi kiya ja sakta",
              "`\"HunterHunterHunterHunterHunter\"`",
              "`5`",
              "`0`",
            ],
          },
          correct: 0,
          exp: {
            en: "Unlike Python, JavaScript does not repeat strings with `*`. It tries to convert `\"Hunter\"` to a number and returns `NaN` (Not-a-Number).",
            ur: "Python ke baraks JavaScript `*` se string repeat nahi karti balki `NaN` (Not-a-Number) return karti hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Use the `typeof` operator to check the data type of variable `xp`.",
            ur: "ULTIMATE TERMINAL: `typeof` operator istemal karke variable `xp` ki data type check karein.",
          },
          code: `let xp = 150;\n// Type expression to check xp's type:`,
          placeholder: "typeof xp",
          acceptedAnswers: ["typeof xp", "typeof(xp)", "console.log(typeof xp)", "console.log(typeof xp);"],
          hint: {
            en: "Type: typeof xp",
            ur: "Yeh type karein: typeof xp",
          },
          exp: {
            en: "`typeof xp` evaluates to `\"number\"`, confirming `xp` holds numeric data.",
            ur: "`typeof xp` batata hai ke `xp` ki data type `\"number\"` hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Convert the string `\"80\"` into a number using `Number()`.",
            ur: "ULTIMATE TERMINAL: String `\"80\"` ko `Number()` function ke zariye number mein badlein.",
          },
          code: `// Convert "80" to a number:`,
          placeholder: 'Number("80")',
          acceptedAnswers: ['Number("80")', "Number('80')", 'Number("80");', "Number('80');"],
          hint: {
            en: 'Type: Number("80")',
            ur: 'Yeh type karein: Number("80")',
          },
          exp: {
            en: "`Number(\"80\")` explicitly converts the string `\"80\"` into the numeric value `80`.",
            ur: "`Number(\"80\")` string `\"80\"` ko asali number `80` mein tabdeel kar deta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 8 — Booleans and Comparisons: true / false (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 8,
      gateRank: "B-Rank",
      enemyName: "STRICT EQUALITY WRAITH",
      topic: {
        en: "Level 8 — Booleans and Comparisons (true / false)",
        ur: "Level 8 — Booleans aur Muqabla Operators (true / false)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "How are Boolean values written in JavaScript?",
            ur: "JavaScript mein Boolean keywords kis tarah likhe jate hain?",
          },
          code: `let isCrit = true;\nlet isStunned = false;`,
          options: {
            en: [
              "true and false (all lowercase)",
              "True and False (capitalized)",
              "TRUE and FALSE",
              "1 and 0 only",
            ],
            ur: [
              "true aur false (chhote harfon mein)",
              "True aur False (capital harf ke sath)",
              "TRUE aur FALSE",
              "Sirf 1 aur 0",
            ],
          },
          correct: 0,
          exp: {
            en: "JavaScript boolean literals are written in all lowercase: `true` and `false`.",
            ur: "JavaScript mein Boolean values hamesha chhote harfon (lowercase) mein likhi jati hain: `true` aur `false`.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Why does `10 === \"10\"` evaluate to `false` in JavaScript?",
            ur: "JavaScript mein `10 === \"10\"` ka jawab `false` kyun aata hai?",
          },
          code: `console.log(10 === "10");`,
          options: {
            en: [
              "Strict equality `===` checks both value AND data type (`number` vs `string`)",
              "10 is smaller than \"10\"",
              "=== means not equal",
              "JavaScript cannot compare strings",
            ],
            ur: [
              "Strict equality `===` value aur data type dono check karti hai (`number` bamane `string`)",
              "10 chhota hai \"10\" se",
              "=== ka matlab barabar nahi hai",
              "JavaScript strings ka muqabla nahi kar sakti",
            ],
          },
          correct: 0,
          exp: {
            en: "`===` (strict equality) returns `false` if the data types differ (`number` `10` vs `string` `\"10\"`).",
            ur: "`===` value ke sath data type bhi check karta hai. Number `10` aur string `\"10\"` ki type alag hai is liye `false` aata hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `let ready = True;` throw `ReferenceError: True is not defined` in JavaScript?",
            ur: "BUG BREAKER: JavaScript mein `let ready = True;` likhne par `ReferenceError` kyun aata hai?",
          },
          code: `let ready = True;\nconsole.log(ready);`,
          options: {
            en: [
              "JavaScript requires lowercase `true` (`let ready = true;`), not Python's capitalized `True`",
              "ready is a reserved keyword",
              "Booleans must be in quotes",
              "Use const instead of let",
            ],
            ur: [
              "JavaScript mein chhote `t` ke sath `true` likha jata hai (`let ready = true;`), capital `True` nahi",
              "ready reserved keyword hai",
              "Boolean ko quotes mein likhna chahiye",
              "let ki jagah const lagayein",
            ],
          },
          correct: 0,
          exp: {
            en: "`True` with a capital `T` is treated as an undeclared variable name in JS. Use lowercase `true`.",
            ur: "JavaScript mein capital `True` ko variable samjha jata hai. Sahi Boolean keyword chhote harfon mein `true` hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why is loose equality `100 == \"100\"` dangerous in combat logic compared to `100 === \"100\"`?",
            ur: "BUG BREAKER: `100 === \"100\"` ke muqable mein `100 == \"100\"` istemal karna kyun khatarnak ho sakta hai?",
          },
          code: `console.log(100 == "100");  // true!\nconsole.log(100 === "100"); // false!`,
          options: {
            en: [
              "`==` performs automatic type coercion and ignores that `\"100\"` is a string; `===` safely verifies both value and type",
              "`==` assigns a value to 100",
              "`===` is slower than `==`",
              "`==` only works on booleans",
            ],
            ur: [
              "`==` data type ko nazar-andaz karke string ko number maan leta hai, jabke `===` value aur type dono ko safely check karta hai",
              "`==` value assign kar deta hai",
              "`===` bohot sust chalta hai",
              "`==` sirf booleans par chalta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Always prefer `===` and `!==` in JavaScript to avoid unexpected type coercion bugs.",
            ur: "JavaScript mein unexpected bugs se bachne ke liye hamesha `===` aur `!==` istemal karna behtar hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Declare `let active = true` using the valid lowercase JavaScript boolean.",
            ur: "ULTIMATE TERMINAL: Sahi lowercase Boolean istemal karte hue `let active = true` type karein.",
          },
          code: `// Set active to true:`,
          placeholder: "let active = true",
          acceptedAnswers: ["let active = true", "let active = true;", "let active=true", "let active=true;"],
          hint: {
            en: "Type: let active = true",
            ur: "Yeh type karein: let active = true",
          },
          exp: {
            en: "`let active = true` stores the boolean `true` in `active`.",
            ur: "`let active = true` variable mein lowercase Boolean `true` mehfooz karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Use strict equality `===` to check if `rank` is strictly equal to `\"S\"`.",
            ur: "ULTIMATE TERMINAL: Strict equality `===` se check karein ke `rank` barabar hai `\"S\"` ke.",
          },
          code: `let rank = "S";\n// Type strict equality comparison:`,
          placeholder: 'rank === "S"',
          acceptedAnswers: ['rank === "S"', 'rank==="S"', "rank === 'S'", "rank==='S'", 'rank === "S";'],
          hint: {
            en: 'Type: rank === "S"',
            ur: 'Yeh type karein: rank === "S"',
          },
          exp: {
            en: "`rank === \"S\"` checks both value and string type, evaluating to `true`!",
            ur: "`rank === \"S\"` value aur type dono check karke `true` deta hai!",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 9 — Conditional Logic: if / else (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 9,
      gateRank: "A-Rank",
      enemyName: "BRANCH EXECUTOR",
      topic: {
        en: "Level 9 — Conditional Logic (if / else)",
        ur: "Level 9 — Shartiya Logic (if / else)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "In JavaScript, what surrounds the condition and what surrounds the code block of an `if` statement?",
            ur: "JavaScript ke `if` statement mein shart (condition) aur code block ko کن brackets mein likha jata hai?",
          },
          code: `if (hp > 0) {\n  console.log("Fighting");\n}`,
          options: {
            en: [
              "Condition in parentheses `( )` and code block in curly braces `{ }`",
              "Condition followed by `:` and indentation only",
              "Condition in `[ ]` and block in `( )`",
              "No brackets at all",
            ],
            ur: [
              "Shart parentheses `( )` mein aur code block curly braces `{ }` mein",
              "Shart ke baad colon `:` aur sirf spaces",
              "Shart `[ ]` mein aur code `( )` mein",
              "Koi brackets nahi lagtin",
            ],
          },
          correct: 0,
          exp: {
            en: "JavaScript wraps the condition inside `( )` and the body inside `{ }`.",
            ur: "JavaScript mein `if` ki shart `( )` ke andar aur chalne wala code `{ }` ke andar likha jata hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will this JavaScript `if / else` statement log when `mana = 30`?",
            ur: "Jab `mana = 30` ho to yeh `if / else` code kya print karega?",
          },
          code: `let mana = 30;\nif (mana >= 50) {\n  console.log("Ultimate");\n} else {\n  console.log("Light Slash");\n}`,
          options: {
            en: ["Ultimate", "Light Slash", "30", "Nothing"],
            ur: ["Ultimate", "Light Slash", "30", "Kuch nahi"],
          },
          correct: 1,
          exp: {
            en: "Since `30 >= 50` is `false`, execution jumps to the `else` block and logs `Light Slash`.",
            ur: "Kyunke `30 >= 50` ghalat (`false`) hai, is liye `else` block chalega aur `Light Slash` print hoga.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this JavaScript `if` statement always log `\"Boss Defeated\"` even when `bossHp` is `100`?",
            ur: "BUG BREAKER: `bossHp` `100` hone ke bawajood yeh `if` code ghalti se `\"Boss Defeated\"` kyun print kar raha hai?",
          },
          code: `let bossHp = 100;\nif (bossHp = 50) {\n  console.log("Boss Defeated");\n}`,
          options: {
            en: [
              "Single `=` inside `if (bossHp = 50)` assigns `50` (a truthy value) instead of comparing with `===`",
              "50 is negative",
              "Curly braces are backwards",
              "bossHp cannot be 100",
            ],
            ur: [
              "`if (bossHp = 50)` mein single `=` muqabla karne ke bajaye `50` assign kar raha hai; `if (bossHp === 50)` likhein",
              "50 manfi number hai",
              "Curly braces ulti hain",
              "bossHp 100 nahi ho sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "`bossHp = 50` assigns `50` to `bossHp`, and since `50` is truthy, the `if` block always runs! Use `===` to compare.",
            ur: "Single `=` value assign kar deta hai aur `50` truthy hone ki wajah se `if` chal parta hai. Muqable ke liye `===` lagayein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: A Python Hunter wrote `elif (xp > 100)` in JavaScript and got a SyntaxError. What is the correct JS keyword?",
            ur: "BUG BREAKER: JavaScript mein `elif (xp > 100)` likhne par SyntaxError aata hai. Sahi JS keyword kya hai?",
          },
          code: `if (xp > 500) {\n  console.log("S");\n} elif (xp > 100) {\n  console.log("C");\n}`,
          options: {
            en: [
              "Replace `elif` with `else if` (two words separated by a space)",
              "Replace `elif` with `elseif`",
              "Remove the parentheses around `xp > 100`",
              "Add a colon after `{`",
            ],
            ur: [
              "`elif` ki jagah `else if` (do alag lafz) likhein",
              "`elif` ki jagah `elseif` likhein",
              "`xp > 100` ke gird se brackets hata dein",
              "`{` ke baad colon lagayein",
            ],
          },
          correct: 0,
          exp: {
            en: "JavaScript uses `else if (condition) { ... }` (two separate words), not `elif`.",
            ur: "JavaScript mein `elif` nahi hota balki do alag lafz `else if (condition)` likhe jate hain.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the JavaScript `if` header checking if `hp > 0` with an opening curly brace `{`.",
            ur: "ULTIMATE TERMINAL: JavaScript mein `if (hp > 0) {` header type karein.",
          },
          code: `// Write the JS if header for hp > 0:`,
          placeholder: "if (hp > 0) {",
          acceptedAnswers: ["if (hp > 0) {", "if(hp>0){", "if (hp > 0)"],
          hint: {
            en: "Type: if (hp > 0) {",
            ur: "Yeh type karein: if (hp > 0) {",
          },
          exp: {
            en: "`if (hp > 0) {` places the condition inside parentheses and opens the block with `{`.",
            ur: "`if (hp > 0) {` shart ko `( )` mein rakh kar `{` se code block shuru karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the `else {` clause to start the fallback block in JavaScript.",
            ur: "ULTIMATE TERMINAL: JavaScript mein fallback block shuru karne ke liye `else {` type karein.",
          },
          code: `if (xp >= 500) {\n  console.log("S-Rank");\n}\n// Start the else block:`,
          placeholder: "else {",
          acceptedAnswers: ["else {", "else{", "} else {", "}else{"],
          hint: {
            en: "Type: else {",
            ur: "Yeh type karein: else {",
          },
          exp: {
            en: "`else {` begins the fallback block that runs when the `if` condition is `false`.",
            ur: "`else {` woh hissa shuru karta hai jo `if` shart ghalat hone par chalta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       JAVASCRIPT LEVEL 10 — S-RANK BOSS FIGHT: S-RANK DOM TITAN: VULCAN-JS
       12-Question Boss Gauntlet | 15s Timer | All 3 Attack Types
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 10,
      gateRank: "S-Rank BOSS",
      enemyName: "S-RANK DOM TITAN: VULCAN-JS",
      topic: {
        en: "Level 10 — S-RANK BOSS GAUNTLET: VULCAN-JS",
        ur: "Level 10 — S-RANK BOSS MUQABLA: VULCAN-JS",
      },
      isBoss: true,
      timer: 15,
      bossTaunts: [
        {
          en: "VULCAN-JS: 'Your Async Twin Daggers are too slow for my High-Voltage DOM Reactor!'",
          ur: "VULCAN-JS: 'Tumhare Async Twin Daggers mere High-Voltage DOM Reactor ke samne bohot sust hain!'",
        },
        {
          en: "VULCAN-JS: 'One type-coercion mistake and my lightning will fry your console!'",
          ur: "VULCAN-JS: 'Ek chhoti si type ghalti aur meri bijli tumhare console ko jala degi!'",
        },
        {
          en: "VULCAN-JS: 'Unleash your Ultimate Terminal if you think you can outspeed a Titan!'",
          ur: "VULCAN-JS: 'Agar Titan ko harana chahte ho to apna Ultimate Terminal chala kar dikhao!'",
        },
      ],
      victoryDialogue: {
        en: "VULCAN-JS: 'My voltage reactor is overloaded... High-Orc Shaman Tusk-JS awaits your command: ARISE!'",
        ur: "VULCAN-JS: 'Mera reactor toot gaya... High-Orc Shaman Tusk-JS aapke hukm ka muntazir hai: ARISE!'",
      },
      defeatDialogue: {
        en: "VULCAN-JS: 'Your JavaScript reflexes failed! Recharge your voltage and challenge the Red Gate again!'",
        ur: "VULCAN-JS: 'Tumhari JavaScript raftaar kam par gayi! Dobara tayyari karke Red Gate mein aao!'",
      },
      questions: [
        {
          attackType: "light",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 1! Can you read console output at lightning speed?'",
            ur: "VULCAN-JS: 'Pehla War! Kya tum bijli ki raftaar se console output pehchan sakte ho?'",
          },
          q: {
            en: "BOSS STRIKE 1/12: What will this JavaScript code log to the console?",
            ur: "BOSS STRIKE 1/12: Yeh JavaScript code console par kya print karega?",
          },
          code: `let boss = "VULCAN-JS";\nconsole.log("Boss: " + boss);`,
          options: {
            en: ["Boss: VULCAN-JS", "Boss: boss", "Boss:+boss", "ReferenceError"],
            ur: ["Boss: VULCAN-JS", "Boss: boss", "Boss:+boss", "ReferenceError"],
          },
          correct: 0,
          exp: {
            en: "`\"Boss: \" + boss` concatenates the two strings into `Boss: VULCAN-JS`.",
            ur: "`\"Boss: \" + boss` dono strings ko jor kar `Boss: VULCAN-JS` print karta hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 2! My syntax distortion jammed your console!'",
            ur: "VULCAN-JS: 'Doosra War! Mere syntax distortion ne tumhara console jam kar diya!'",
          },
          q: {
            en: "BOSS STRIKE 2/12 — BUG BREAKER: Why does `console.log(\"Thunder Slash)` fail?",
            ur: "BOSS STRIKE 2/12 — BUG BREAKER: `console.log(\"Thunder Slash)` kyun fail ho raha hai?",
          },
          code: `console.log("Thunder Slash);`,
          options: {
            en: [
              'Missing closing double quote `"` after `Thunder Slash` (`console.log("Thunder Slash");`)',
              "Semicolon is illegal",
              "console must be capitalized",
              "Thunder Slash cannot have a space",
            ],
            ur: [
              '`Thunder Slash` ke baad band karne wala quote `"` missing hai (`console.log("Thunder Slash");`)',
              "Semicolon lagana mana hai",
              "console capital hona chahiye",
              "Thunder Slash mein space nahi aa sakti",
            ],
          },
          correct: 0,
          exp: {
            en: "Every string literal must end with a matching quote before the closing parenthesis `)`.",
            ur: "Bracket `)` band karne se pehle string ka quote `\"` band karna lazmi hai.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 3! Navigate through my commented traps!'",
            ur: "VULCAN-JS: 'Teesra War! Mere comment traps ke beech se sahi jawab nikalo!'",
          },
          q: {
            en: "BOSS STRIKE 3/12: What is the final value of `volt` logged here?",
            ur: "BOSS STRIKE 3/12: Yahan `volt` ki aakhri value kya print hogi?",
          },
          code: `let volt = 50;\n// volt = 999;\n/* volt += 500; */\nvolt += 30;\nconsole.log(volt);`,
          options: {
            en: ["50", "80", "580", "1029"],
            ur: ["50", "80", "580", "1029"],
          },
          correct: 1,
          exp: {
            en: "Both `// volt = 999;` and `/* volt += 500; */` are comments. Only `volt += 30` runs, updating `50` to `80`.",
            ur: "Line 2 aur Line 3 dono comments hain. Sirf `volt += 30` chalta hai jis se `50 + 30 = 80` aata hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 4! You dare mutate a constant reactor core?!'",
            ur: "VULCAN-JS: 'Chautha War! Tum ek constant core ko badalne ki koshish kar rahe ho?!'",
          },
          q: {
            en: "BOSS STRIKE 4/12 — BUG BREAKER: How do you fix this TypeError so `shield` can be reduced?",
            ur: "BOSS STRIKE 4/12 — BUG BREAKER: Is TypeError ko kaise theek karein taake `shield` kam ho sake?",
          },
          code: `const shield = 500;\nshield -= 100;\nconsole.log(shield);`,
          options: {
            en: [
              "Change `const shield = 500;` to `let shield = 500;` so `shield` can be updated",
              "Change `-=` to `=-`",
              "Put 500 in quotes",
              "Delete console.log",
            ],
            ur: [
              "`const shield = 500;` ko `let shield = 500;` mein badlein taake value update ho sake",
              "`-=` ko `=-` bana dein",
              "500 ko quotes mein likhein",
              "console.log mita dein",
            ],
          },
          correct: 0,
          exp: {
            en: "Variables modified with `-=` or `+=` must be declared with `let`, never `const`.",
            ur: "Jin variables ki value `-=` ya `+=` se badalni ho unhein `const` ke bajaye `let` se banana chahiye.",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 5! Charge your twin daggers in the live terminal!'",
            ur: "VULCAN-JS: 'Panchwan War! Live terminal mein apne daggers charge karo!'",
          },
          q: {
            en: "BOSS STRIKE 5/12 — ULTIMATE: Declare `let power = 900` in JavaScript.",
            ur: "BOSS STRIKE 5/12 — ULTIMATE: JavaScript mein `let power = 900` declare karein.",
          },
          code: `// Declare mutable variable power equal to 900:`,
          placeholder: "let power = 900",
          acceptedAnswers: ["let power = 900", "let power = 900;", "let power=900", "let power=900;"],
          hint: {
            en: "Type: let power = 900",
            ur: "Yeh type karein: let power = 900",
          },
          exp: {
            en: "LIGHTNING HIT! `let power = 900` charges your Cyber Assassin blades to 900 voltage!",
            ur: "BIJLI KA WAR! `let power = 900` ne aapke daggers ko 900 power se charge kar diya!",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 6! Identify the data types flowing through my circuit!'",
            ur: "VULCAN-JS: 'Chhata War! Mere circuit mein behne wali data types pehchano!'",
          },
          q: {
            en: "BOSS STRIKE 6/12: What does `console.log(typeof 3.14, typeof \"3.14\")` output?",
            ur: "BOSS STRIKE 6/12: `console.log(typeof 3.14, typeof \"3.14\")` kya print karega?",
          },
          code: `console.log(typeof 3.14, typeof "3.14");`,
          options: {
            en: [
              "number string",
              "float string",
              "number number",
              "decimal text",
            ],
            ur: [
              "number string",
              "float string",
              "number number",
              "decimal text",
            ],
          },
          correct: 0,
          exp: {
            en: "`3.14` has type `\"number\"` (JS uses `number` for all floats and ints), while `\"3.14\"` in quotes has type `\"string\"`.",
            ur: "`3.14` ki type `\"number\"` hai aur quotes wale `\"3.14\"` ki type `\"string\"` hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 7! Your string coercion trap backfired!'",
            ur: "VULCAN-JS: 'Satwan War! Tumhara string addition trap ulta par gaya!'",
          },
          q: {
            en: "BOSS STRIKE 7/12 — BUG BREAKER: Why does `\"20\" + 5` evaluate to `\"205\"` while `\"20\" - 5` evaluates to `15`?",
            ur: "BOSS STRIKE 7/12 — BUG BREAKER: JS mein `\"20\" + 5` se `\"205\"` banta hai magar `\"20\" - 5` se `15` kyun aata hai?",
          },
          code: `console.log("20" + 5); // "205"\nconsole.log("20" - 5); // 15`,
          options: {
            en: [
              "`+` concatenates strings when one side is a string, whereas `-` only does math and converts `\"20\"` to number `20`",
              "`-` deletes the last digit",
              "Both actually output 15",
              "`+` multiplies by 10",
            ],
            ur: [
              "`+` string ke sath text jorta hai (`\"205\"`), jabke `-` sirf hisab karta hai aur `\"20\"` ko number bana kar `15` deta hai",
              "`-` aakhri digit mita deta hai",
              "Dono ka jawab 15 aata hai",
              "`+` 10 se zarb deta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "The `+` operator is overloaded for string concatenation, while `-`, `*`, and `/` only perform numeric arithmetic.",
            ur: "`+` operator strings ko jorne ka kaam bhi karta hai, jabke `-` sirf hisabi tafreeq karta hai.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 8! Test your strict comparisons against my Titan core!'",
            ur: "VULCAN-JS: 'Aathwan War! Mere Titan core par apne strict comparisons aazmao!'",
          },
          q: {
            en: "BOSS STRIKE 8/12: What does `console.log(50 !== \"50\")` output in JavaScript?",
            ur: "BOSS STRIKE 8/12: JavaScript mein `console.log(50 !== \"50\")` kya output dega?",
          },
          code: `console.log(50 !== "50");`,
          options: {
            en: ["true", "false", "50", "NaN"],
            ur: ["true", "false", "50", "NaN"],
          },
          correct: 0,
          exp: {
            en: "`!==` checks strict inequality. Since number `50` and string `\"50\"` have different types, they are strictly NOT equal (`true`).",
            ur: "`!==` strict inequality check karta hai. Number `50` aur string `\"50\"` ki type alag hai, is liye woh barabar nahi hain (`true`).",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 9! Spot the flaw in your Assassin identifier!'",
            ur: "VULCAN-JS: 'Nawan War! Apne Assassin variable naam ki ghalti pakro!'",
          },
          q: {
            en: "BOSS STRIKE 9/12 — BUG BREAKER: Which variable declaration is INVALID in JavaScript?",
            ur: "BOSS STRIKE 9/12 — BUG BREAKER: In mein se kaunsa JavaScript variable naam GHALAT hai?",
          },
          code: `let $crit = 50;\nlet _dodge = 20;\nlet cyber-strike = 99;`,
          options: {
            en: [
              "Line 1 (`$crit`)",
              "Line 2 (`_dodge`)",
              "Line 3 (`cyber-strike` contains a hyphen `-`)",
              "None of them",
            ],
            ur: [
              "Line 1 (`$crit`)",
              "Line 2 (`_dodge`)",
              "Line 3 (`cyber-strike` mein hyphen `-` laga hai)",
              "Koi bhi ghalat nahi",
            ],
          },
          correct: 2,
          exp: {
            en: "Hyphens `-` are not allowed in JavaScript variable names because `-` is the subtraction operator. Use `cyberStrike`.",
            ur: "JavaScript variable ke naam mein `-` nahi aa sakta. Iski jagah camelCase `cyberStrike` likhein.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 10! Trace my multi-branch circuit!'",
            ur: "VULCAN-JS: 'Daswan War! Mere multi-branch circuit ka output batao!'",
          },
          q: {
            en: "BOSS STRIKE 10/12: What will this `if / else if / else` ladder output?",
            ur: "BOSS STRIKE 10/12: Yeh `if / else if / else` code kya print karega?",
          },
          code: `let xp = 520;\nif (xp >= 500) {\n  console.log("S-Rank");\n} else if (xp >= 300) {\n  console.log("A-Rank");\n} else {\n  console.log("C-Rank");\n}`,
          options: {
            en: ["S-Rank", "A-Rank", "C-Rank", "S-Rank and A-Rank"],
            ur: ["S-Rank", "A-Rank", "C-Rank", "S-Rank aur A-Rank"],
          },
          correct: 0,
          exp: {
            en: "Since `520 >= 500` is `true`, the first `if` block runs and logs `S-Rank`, skipping the remaining branches.",
            ur: "Kyunke pehli shart `520 >= 500` sach (`true`) hai, `S-Rank` print hoga aur baki hissa skip ho jayega.",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "VULCAN-JS: 'Strike 11! My DOM core is exposed! Amplify your damage in the terminal!'",
            ur: "VULCAN-JS: 'Gyarhwan War! Mera DOM core khul gaya hai! Terminal mein apna damage double karo!'",
          },
          q: {
            en: "BOSS STRIKE 11/12 — ULTIMATE: Double `dmg` using the `*=` operator (`dmg *= 2`).",
            ur: "BOSS STRIKE 11/12 — ULTIMATE: `*=` operator istemal karke `dmg` ko `2` se zarb dein (`dmg *= 2`).",
          },
          code: `let dmg = 450;\n// Multiply dmg by 2 using *=:`,
          placeholder: "dmg *= 2",
          acceptedAnswers: ["dmg *= 2", "dmg *= 2;", "dmg*=2", "dmg*=2;", "dmg = dmg * 2", "dmg = dmg * 2;"],
          hint: {
            en: "Type: dmg *= 2",
            ur: "Yeh type karein: dmg *= 2",
          },
          exp: {
            en: "CRITICAL OVERLOAD! `dmg *= 2` surges your attack to `900`, shattering VULCAN-JS's reactor plating!",
            ur: "ZABARDAST OVERLOAD! `dmg *= 2` ne hamle ki taqat `900` karke VULCAN-JS ki shield tod di!",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "VULCAN-JS: 'FINAL STRIKE 12/12! Execute the final console command and claim my shadow!'",
            ur: "VULCAN-JS: 'AAKHRI WAR 12/12! Aakhri console command chala kar mera Shadow hasil karo!'",
          },
          q: {
            en: "🌌 BOSS FINISHER 12/12 — ULTIMATE: Type `console.log(\"ARISE\")` to defeat VULCAN-JS and extract Tusk-JS!",
            ur: "🌌 BOSS FINISHER 12/12 — ULTIMATE: VULCAN-JS ko harane aur Tusk-JS ko nikalne ke liye `console.log(\"ARISE\")` type karein!",
          },
          code: `// Cast the Final Cyber Assassin Finisher:`,
          placeholder: 'console.log("ARISE")',
          acceptedAnswers: [
            'console.log("ARISE")',
            'console.log("ARISE");',
            "console.log('ARISE')",
            "console.log('ARISE');",
            'console.log("Arise")',
            "console.log('Arise')",
          ],
          hint: {
            en: 'Type: console.log("ARISE")',
            ur: 'Yeh type karein: console.log("ARISE")',
          },
          exp: {
            en: "🌌 S-RANK DOM TITAN OBLITERATED! `console.log(\"ARISE\")` extracts High-Orc Shaman Tusk-JS into your Shadow Army!",
            ur: "🌌 S-RANK DOM TITAN SHIKAST KHA GAYA! `console.log(\"ARISE\")` ne High-Orc Shaman Tusk-JS ko aapki Shadow Army mein shamil kar diya!",
          },
        },
      ],
    }),
  ];

  const JS_ALL_LEVELS = JS_LEVELS_1_TO_5.concat(JS_LEVELS_6_TO_10);

  /* ========================================================================
     8. C++ CLASS — LEVELS 1 TO 5 (HANDCRAFTED)
     Distribution: L1(3), L2(5), L3(5), L4(5), L5(5) = 23 Questions
     ======================================================================== */
  const CPP_LEVELS_1_TO_5 = [
    /* ----------------------------------------------------------------------
       C++ LEVEL 1 — Output and Syntax Basics: cout (3 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 1,
      gateRank: "E-Rank",
      enemyName: "STREAM SENTINEL",
      topic: {
        en: "Level 1 — Output and Syntax Basics (cout)",
        ur: "Level 1 — Output aur Syntax ki Bunyad (cout)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which C++ stream object and operator are used to output text to the console?",
            ur: "C++ mein console par text print karne ke liye kaunsa object aur operator istemal hota hai?",
          },
          code: `// Output text in C++\ncout << "Berserker Monarch";`,
          options: {
            en: ["cout <<", "cin >>", "print()", "console.log()"],
            ur: ["cout <<", "cin >>", "print()", "console.log()"],
          },
          correct: 0,
          exp: {
            en: "In C++, `cout` paired with the insertion operator `<<` sends output to the standard console stream.",
            ur: "C++ mein screen par output bhejne ke liye `cout` ke sath `<<` operator istemal hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does this C++ line fail to compile?",
            ur: "BUG BREAKER: Yeh C++ code compile kyun nahi ho raha?",
          },
          code: `cout << "Shadow Cleave"\nreturn 0;`,
          options: {
            en: [
              "Missing semicolon `;` at the end of `cout << \"Shadow Cleave\";`",
              "`<<` should be `>>`",
              "Double quotes are not allowed in C++",
              "cout must be capitalized",
            ],
            ur: [
              "`cout << \"Shadow Cleave\"` ke aakhir mein semicolon `;` missing hai",
              "`<<` ki jagah `>>` hona chahiye",
              "C++ mein double quotes mana hain",
              "cout capital hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "In C++, every statement must end with a semicolon `;` (`cout << \"Shadow Cleave\";`).",
            ur: "C++ mein har statement ke aakhir mein semicolon `;` lagana lazmi hota hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the C++ statement to output `\"Arise\"` using `cout`.",
            ur: "ULTIMATE TERMINAL: `cout` istemal karte hue `\"Arise\"` print karne ka C++ code likhein.",
          },
          code: `// Output "Arise" using cout:`,
          placeholder: 'cout << "Arise";',
          acceptedAnswers: [
            'cout << "Arise";',
            'cout << "Arise"',
            'std::cout << "Arise";',
            'std::cout << "Arise"',
          ],
          hint: {
            en: 'Type: cout << "Arise";',
            ur: 'Yeh type karein: cout << "Arise";',
          },
          exp: {
            en: "`cout << \"Arise\";` channels your Berserker Greatsword strike through the C++ output stream!",
            ur: "`cout << \"Arise\";` C++ console par Arise print karke aapka pehla waar mukammal karta hai!",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 2 — Strings vs Numbers and Quotes (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 2,
      gateRank: "E-Rank",
      enemyName: "LITERAL GARGOYLE",
      topic: {
        en: "Level 2 — Strings vs Numbers and Quotes",
        ur: "Level 2 — Strings Bamane Numbers aur Quotes",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What is the difference between `cout << 40 + 60;` and `cout << \"40 + 60\";` in C++?",
            ur: "C++ mein `cout << 40 + 60;` aur `cout << \"40 + 60\";` ke output mein kya farq hai?",
          },
          code: `cout << 40 + 60;\ncout << "40 + 60";`,
          options: {
            en: [
              "First outputs 100 (number math), second outputs 40 + 60 (literal text)",
              "Both output 100",
              "Both output 40 + 60",
              "First causes a compile error",
            ],
            ur: [
              "Pehla 100 print karega (hisab), doosra 40 + 60 (text) print karega",
              "Dono 100 print karenge",
              "Dono 40 + 60 print karenge",
              "Pehلا compile error dega",
            ],
          },
          correct: 0,
          exp: {
            en: "Unquoted `40 + 60` is evaluated by C++ as integer addition (`100`), whereas `\"40 + 60\"` in double quotes is printed as text.",
            ur: "Baghair quotes ke `40 + 60` jama ho kar `100` banta hai, jabke double quotes ke andar `\"40 + 60\"` text ke taur par छپتا hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "In C++, which quotes are required for multi-character string literals like `\"Monarch\"`?",
            ur: "C++ mein `\"Monarch\"` jaise string text ke liye kaunse quotes lagana zaroori hai?",
          },
          code: `cout << "Monarch";`,
          options: {
            en: [
              "Double quotes `\" \"` (single quotes `' '` are only for a single `char`)",
              "Single quotes `' '`",
              "Backticks `` ` ` ``",
              "No quotes",
            ],
            ur: [
              "Double quotes `\" \"` (kyunke single quotes `' '` sirf ek harf `char` ke liye hote hain)",
              "Single quotes `' '`",
              "Backticks `` ` ` ``",
              "Koi quotes nahi",
            ],
          },
          correct: 0,
          exp: {
            en: "C++ strictly distinguishes double quotes `\" \"` for strings and single quotes `' '` for a single character (`char`).",
            ur: "C++ mein poori string ke liye hamesha double quotes `\" \"` lagte hain; single quotes `' '` sirf ek character (`char`) ke liye hote hain.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why is `cout << 'Shadow';` a bug in C++?",
            ur: "BUG BREAKER: C++ mein `cout << 'Shadow';` likhna kyun ghalat hai?",
          },
          code: `// Broken C++ string quotes\ncout << 'Shadow';`,
          options: {
            en: [
              "Multi-character strings in C++ must use double quotes `\"Shadow\"`, not single quotes `'Shadow'`",
              "Shadow must be lowercase",
              "Semicolon is not allowed",
              "cout cannot print words",
            ],
            ur: [
              "C++ mein ek se zyada harfon wali string ke liye double quotes `\"Shadow\"` lagana zaroori hai, single quotes `'Shadow'` nahi",
              "Shadow chhote harfon mein hona chahiye",
              "Semicolon lagana mana hai",
              "cout lafz print nahi kar sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "In C++, `' '` is reserved for single-character `char` literals (e.g. `'S'`). Strings require double quotes `\"Shadow\"`.",
            ur: "C++ mein `' '` sirf ek harf (`'S'`) ke liye hota hai. Lafz `\"Shadow\"` ko double quotes mein likhna zaroori hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `cout << \"HP: \" << 100` fail to compile?",
            ur: "BUG BREAKER: `cout << \"HP: \" << 100` compile kyun nahi ho raha?",
          },
          code: `cout << "HP: " << 100`,
          options: {
            en: [
              "Missing semicolon `;` at the end of the statement (`cout << \"HP: \" << 100;`)",
              "You cannot chain `<<` twice in C++",
              "100 must be inside quotes",
              "HP must be lowercase",
            ],
            ur: [
              "Statement ke aakhir mein semicolon `;` lagana bhool gaye hain (`cout << \"HP: \" << 100;`)",
              "C++ mein do dafa `<<` nahi laga sakte",
              "100 ko quotes mein hona chahiye",
              "HP chhote harfon mein hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "Chaining `<<` is valid in C++, but the statement still requires a terminating semicolon `;`.",
            ur: "C++ mein `<<` chain karna bilkul sahi hai magar line ke aakhir mein semicolon `;` lagana lazmi hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Output the numeric value `250` (without quotes) using `cout`.",
            ur: "ULTIMATE TERMINAL: Baghair quotes ke number `250` ko `cout` ke zariye print karein.",
          },
          code: `// Output numeric value 250 with cout:`,
          placeholder: "cout << 250;",
          acceptedAnswers: ["cout << 250;", "cout << 250", "std::cout << 250;", "std::cout << 250"],
          hint: {
            en: "Type: cout << 250;",
            ur: "Yeh type karein: cout << 250;",
          },
          exp: {
            en: "`cout << 250;` streams the integer literal `250` directly to standard output.",
            ur: "`cout << 250;` baghair quotes ke seedha integer number `250` console par bhejta hai.",
          },
        },
      ],
    }),

    // ----------------------------------------------------------------------
    // C++ LEVEL 3 — Comments and Code Readability (5 Questions)
    // ----------------------------------------------------------------------
    makeLevel({
      level: 3,
      gateRank: "D-Rank",
      enemyName: "PREPROCESSOR WRAITH",
      topic: {
        en: "Level 3 — Comments and Code Readability (// and /* */)",
        ur: "Level 3 — Comments aur Code ki Wazahat (// aur /* */)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which two comment styles are supported by the C++ compiler?",
            ur: "C++ compiler mein comments likhne ke kaunse do tariqe mojood hain?",
          },
          code: `// Single-line comment\n/* Multi-line comment */`,
          options: {
            en: [
              "`//` for single-line and `/* */` for multi-line comments",
              "`#` for single-line and `''' '''` for multi-line",
              "`<!-- -->` only",
              "`--` only",
            ],
            ur: [
              "Single-line ke liye `//` aur multi-line ke liye `/* */`",
              "Single-line ke liye `#` aur multi-line ke liye `''' '''`",
              "Sirf `<!-- -->`",
              "Sirf `--`",
            ],
          },
          correct: 0,
          exp: {
            en: "C++ supports `//` for single-line comments and `/* ... */` for block comments.",
            ur: "C++ mein ek line ke comment ke liye `//` aur bade block comment ke liye `/* ... */` istemal hota hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will this C++ code output when compiled and executed?",
            ur: "Jab yeh C++ code run hoga to kya output aayega?",
          },
          code: `// cout << "Decoy";\ncout << "Real Strike"; /* inline note */`,
          options: {
            en: ["Decoy", "Real Strike", "DecoyReal Strike", "Compile Error"],
            ur: ["Decoy", "Real Strike", "DecoyReal Strike", "Compile Error"],
          },
          correct: 1,
          exp: {
            en: "Line 1 is commented out with `//` and the trailing `/* inline note */` is ignored, so only `Real Strike` is printed.",
            ur: "Pehli line `//` ki wajah se comment hai, is liye sirf `Real Strike` print hoga.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `# Full Power Strike` cause a compiler error in C++?",
            ur: "BUG BREAKER: C++ mein `# Full Power Strike` likhne par compiler error kyun aata hai?",
          },
          code: `# Full Power Strike\ncout << 999;`,
          options: {
            en: [
              "In C++, `#` is for preprocessor directives (like `#include`), not comments; use `// Full Power Strike`",
              "999 is too large",
              "cout cannot print integers",
              "Strike is a C++ keyword",
            ],
            ur: [
              "C++ mein `#` preprocessor directives (`#include`) ke liye hota hai, comment ke liye nahi; `// Full Power Strike` likhein",
              "999 bohot bada number hai",
              "cout numbers print nahi kar sakta",
              "Strike C++ ka keyword hai",
            ],
          },
          correct: 0,
          exp: {
            en: "The C++ preprocessor treats `#` as a directive prefix. Always use `//` or `/* */` for comments in C++.",
            ur: "C++ mein `#` sirf `#include` waghera ke liye hota hai. Comment likhne ke liye `//` istemal karein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Fix the unclosed block comment that is breaking this C++ file!",
            ur: "BUG BREAKER: Is C++ code mein khule reh jane wale block comment ko kaise theek karein?",
          },
          code: `/* Initialize Berserker Rage\ncout << "Rage Active";`,
          options: {
            en: [
              "Close the comment on line 1 with `*/` (`/* Initialize Berserker Rage */`)",
              "Add another `/*` at the end of line 2",
              "Remove the semicolon on line 2",
              "Change cout to cin",
            ],
            ur: [
              "Line 1 ke aakhir mein `*/` laga kar comment band karein (`/* Initialize Berserker Rage */`)",
              "Line 2 ke aakhir mein ek aur `/*` lagayein",
              "Line 2 se semicolon hata dein",
              "cout ko cin bana dein",
            ],
          },
          correct: 0,
          exp: {
            en: "An unclosed `/*` causes a compile error because the compiler searches to the end of the file for `*/`.",
            ur: "`/*` comment ko `*/` se band na karne par compiler poori file ko comment samajh kar error de deta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type a single-line C++ comment that says `// Berserker`.",
            ur: "ULTIMATE TERMINAL: C++ mein single-line comment `// Berserker` type karein.",
          },
          code: `// Write a single-line C++ comment below:`,
          placeholder: "// Berserker",
          acceptedAnswers: ["// Berserker", "//Berserker", "// berserker", "//berserker"],
          hint: {
            en: "Type: // Berserker",
            ur: "Yeh type karein: // Berserker",
          },
          exp: {
            en: "`// Berserker` is a valid single-line C++ comment ignored by the compiler.",
            ur: "`// Berserker` C++ mein bilkul durust single-line comment hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 4 — Variables and Memory Storage (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 4,
      gateRank: "D-Rank",
      enemyName: "STACK ALLOCATOR",
      topic: {
        en: "Level 4 — Variables and Memory Storage",
        ur: "Level 4 — Variables aur Memory Storage",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "How do you declare an integer variable named `hp` with value `100` in C++?",
            ur: "C++ mein `100` value ke sath `hp` naam ka integer variable kaise banaya jata hai?",
          },
          code: `int hp = 100;\ncout << hp;`,
          options: {
            en: ["int hp = 100;", "let hp = 100;", "hp = 100", "var hp = 100;"],
            ur: ["int hp = 100;", "let hp = 100;", "hp = 100", "var hp = 100;"],
          },
          correct: 0,
          exp: {
            en: "C++ is statically typed: you must specify the data type (`int`) before the variable name (`int hp = 100;`).",
            ur: "C++ mein variable banane ke liye pehle uski data type (`int`) likhna zaroori hota hai (`int hp = 100;`).",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What will `cout << mana;` output after executing these two lines?",
            ur: "In do lines ke chalne ke baad `cout << mana;` kya print karega?",
          },
          code: `int mana = 80;\nmana = 200;\ncout << mana;`,
          options: {
            en: ["80", "200", "280", "mana"],
            ur: ["80", "200", "280", "mana"],
          },
          correct: 1,
          exp: {
            en: "`mana = 200;` overwrites the previous value `80` in memory with `200`.",
            ur: "`mana = 200;` purani value `80` ko hata kar memory mein nayi value `200` save kar deta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `atk = 50;` fail to compile when `atk` has never been declared before?",
            ur: "BUG BREAKER: Agar `atk` pehle declare na hua ho to C++ mein seedha `atk = 50;` likhne par error kyun aata hai?",
          },
          code: `// Undeclared identifier in C++\natk = 50;\ncout << atk;`,
          options: {
            en: [
              "C++ requires a data type like `int` when declaring a new variable (`int atk = 50;`)",
              "50 is too small for C++",
              "Semicolons are not allowed on variable lines",
              "atk must be in quotes",
            ],
            ur: [
              "C++ mein naya variable banate waqt shuru mein data type (`int atk = 50;`) likhna lazmi hai",
              "50 C++ ke liye chhota hai",
              "Variable wali line par semicolon mana hai",
              "atk ko quotes mein hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "Unlike Python, C++ requires every variable to be declared with its explicit type (`int atk = 50;`) before use.",
            ur: "Python ke baraks C++ mein har naye variable ke shuru mein uski type (`int atk = 50;`) batana zaroori hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does declaring `int xp` twice in the same scope cause a redefinition error?",
            ur: "BUG BREAKER: Ek hi जगह do dafa `int xp` likhne par C++ compiler error kyun deta hai?",
          },
          code: `int xp = 100;\nint xp = 250; // Redefinition error!`,
          options: {
            en: [
              "Once `int xp` is declared, update it without repeating `int` (`xp = 250;`)",
              "xp can never be changed in C++",
              "250 is not an int",
              "Use let on line 2",
            ],
            ur: [
              "Ek dafa `int xp` banane ke baad usay update karne ke liye dobara `int` nahi likhte (`xp = 250;`)",
              "C++ mein xp kabhi badal nahi sakta",
              "250 int nahi hai",
              "Line 2 par let lagayein",
            ],
          },
          correct: 0,
          exp: {
            en: "You only write the type `int` when creating the variable for the first time. Subsequent updates just use `xp = 250;`.",
            ur: "Variable banate waqt sirf pehli dafa `int` likha jata hai; baad mein value badalne ke liye sirf `xp = 250;` likhein.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Declare an `int` variable named `xp` and initialize it to `50` in C++.",
            ur: "ULTIMATE TERMINAL: C++ mein `int` type ka `xp` variable banayein aur usay `50` value dein.",
          },
          code: `// Declare integer xp equal to 50:`,
          placeholder: "int xp = 50;",
          acceptedAnswers: ["int xp = 50;", "int xp = 50", "int xp=50;", "int xp=50"],
          hint: {
            en: "Type: int xp = 50;",
            ur: "Yeh type karein: int xp = 50;",
          },
          exp: {
            en: "`int xp = 50;` allocates a 32-bit integer on the stack and initializes it to `50`.",
            ur: "`int xp = 50;` memory mein integer variable `xp` bana kar us mein `50` save kar deta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 5 — Updating Variables and Math Operations (5 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 5,
      gateRank: "C-Rank",
      enemyName: "ALU COLOSSUS",
      topic: {
        en: "Level 5 — Updating Variables and Mathematical Operations",
        ur: "Level 5 — Variables Update Karna aur Hisabi Operations",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What will `cout << rage;` output after these C++ arithmetic updates?",
            ur: "In hisabi updates ke baad `cout << rage;` kya output dega?",
          },
          code: `int rage = 30;\nrage += 20;\nrage *= 2;\ncout << rage;`,
          options: {
            en: ["50", "100", "70", "60"],
            ur: ["50", "100", "70", "60"],
          },
          correct: 1,
          exp: {
            en: "`rage` goes from `30` to `50` (`+= 20`), and then doubles to `100` (`*= 2`).",
            ur: "`rage` pehle `30 + 20` se `50` hota hai aur phir `* 2` ho kar `100` ban jata hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "What does integer division `9 / 2` evaluate to in C++?",
            ur: "C++ mein do integers ki taqseem `9 / 2` ka jawab kya aata hai?",
          },
          code: `int slash = 9 / 2;\ncout << slash;`,
          options: {
            en: ["4", "4.5", "5", "1"],
            ur: ["4", "4.5", "5", "1"],
          },
          correct: 0,
          exp: {
            en: "In C++, dividing two `int` values truncates the decimal fraction (`.5` is dropped), leaving `4`.",
            ur: "C++ mein jab do `int` divide hote hain to point ke baad wala hissa (`.5`) kat jata hai aur `4` bachta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `double ratio = 5 / 2;` store `2.0` instead of `2.5` in C++?",
            ur: "BUG BREAKER: C++ mein `double ratio = 5 / 2;` likhne par `2.5` ke bajaye `2.0` kyun store hota hai?",
          },
          code: `double ratio = 5 / 2;\ncout << ratio; // Prints 2 instead of 2.5!`,
          options: {
            en: [
              "Because both `5` and `2` are `int` literals, integer division happens first (`2`); use `5.0 / 2.0` for decimal division",
              "double cannot hold decimals in C++",
              "5 / 2 is 2.0 in math",
              "Use int instead of double",
            ],
            ur: [
              "Kyunke `5` aur `2` dono `int` hain is liye pehle integer division (`2`) ho jati hai; sahi point wale jawab ke liye `5.0 / 2.0` likhein",
              "C++ mein double point wali value nahi rakh sakta",
              "Hisab mein 5 / 2 ka jawab 2 hota hai",
              "double ki jagah int lagayein",
            ],
          },
          correct: 0,
          exp: {
            en: "At least one operand must be a floating-point number (`5.0 / 2` or `5 / 2.0`) for C++ to perform floating-point division (`2.5`).",
            ur: "Point mein jawab hasil karne ke liye kam az kam ek number point wala (`5.0 / 2.0`) hona zaroori hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why is `armor` still `100` after `armor - 40;` executes?",
            ur: "BUG BREAKER: `armor - 40;` chalne ke baad bhi `armor` ki value `100` kyun reh gayi?",
          },
          code: `int armor = 100;\narmor - 40;\ncout << armor;`,
          options: {
            en: [
              "`armor - 40;` does not assign the result back; use `armor -= 40;` or `armor = armor - 40;`",
              "C++ cannot subtract 40",
              "armor is a constant",
              "cout resets armor to 100",
            ],
            ur: [
              "`armor - 40;` ne natija wapas `armor` mein save nahi kiya; `armor -= 40;` ya `armor = armor - 40;` likhein",
              "C++ 40 minus nahi kar sakti",
              "armor constant hai",
              "cout value ko 100 par reset kar deta hai",
            ],
          },
          correct: 0,
          exp: {
            en: "Use `armor -= 40;` to subtract `40` and store the updated `60` back into `armor`.",
            ur: "`armor -= 40;` istemal karne se `40` minus ho kar nayi value `60` wapas `armor` mein save ho jati hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Add `30` to `atk` using the `+=` operator in C++.",
            ur: "ULTIMATE TERMINAL: C++ mein `+=` operator istemal karke `atk` mein `30` jama karein.",
          },
          code: `int atk = 70;\n// Add 30 to atk using +=:`,
          placeholder: "atk += 30;",
          acceptedAnswers: ["atk += 30;", "atk += 30", "atk+=30;", "atk+=30", "atk = atk + 30;", "atk = atk + 30"],
          hint: {
            en: "Type: atk += 30;",
            ur: "Yeh type karein: atk += 30;",
          },
          exp: {
            en: "`atk += 30;` increases `atk` from `70` to `100` with zero overhead!",
            ur: "`atk += 30;` variable `atk` mein `30` jama karke usay `100` bana deta hai!",
          },
        },
      ],
    }),
  ];

  /* ========================================================================
     9. C++ CLASS — LEVELS 6 TO 10 (HANDCRAFTED)
     Distribution: L6(6), L7(6), L8(6), L9(6), L10 Boss(12) = 36 Questions
     ======================================================================== */
  const CPP_LEVELS_6_TO_10 = [
    /* ----------------------------------------------------------------------
       C++ LEVEL 6 — Variable Naming Rules and Bugs (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 6,
      gateRank: "C-Rank",
      enemyName: "SYNTAX EXECUTIONER",
      topic: {
        en: "Level 6 — Variable Naming Rules and Bugs",
        ur: "Level 6 — Variable Naam Rakhne ke Qanoon aur Bugs",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which of the following is a VALID identifier name in C++?",
            ur: "In mein se kaunsa C++ variable naam bilkul SAHI (valid) hai?",
          },
          code: `// Choose the valid C++ variable name:`,
          options: {
            en: ["sword_damage_1", "1_sword_damage", "sword-damage", "int"],
            ur: ["sword_damage_1", "1_sword_damage", "sword-damage", "int"],
          },
          correct: 0,
          exp: {
            en: "`sword_damage_1` starts with a letter and uses letters, underscores, and digits. Identifiers cannot start with a digit, use `-`, or use keywords like `int`.",
            ur: "`sword_damage_1` letter se shuru hota hai aur underscore istemal karta hai. Naam number se shuru nahi ho sakta aur na `int` keyword ho sakta hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Why can you NOT name a variable `class` or `return` in C++?",
            ur: "C++ mein kisi variable ka naam `class` ya `return` kyun nahi rakha ja sakta?",
          },
          code: `// Invalid variable declarations:\n// int class = 5;\n// int return = 10;`,
          options: {
            en: [
              "They are reserved C++ keywords with special meaning to the compiler",
              "They are too short",
              "C++ only allows uppercase variable names",
              "They contain vowels",
            ],
            ur: [
              "Yeh C++ ke reserved keywords hain jin ka compiler ke liye khas matlab hota hai",
              "Yeh lafz bohot chhote hain",
              "C++ mein sirf bade harf chalte hain",
              "In mein vowels hain",
            ],
          },
          correct: 0,
          exp: {
            en: "Reserved keywords (`int`, `class`, `return`, `if`, `double`) cannot be used as variable names in C++.",
            ur: "C++ ke reserved keywords (`int`, `class`, `return`, `if`) ko variable ke naam ke taur par istemal nahi kar sakte.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `int max hp = 100;` fail to compile in C++?",
            ur: "BUG BREAKER: C++ mein `int max hp = 100;` compile kyun nahi hota?",
          },
          code: `int max hp = 100;`,
          options: {
            en: [
              "Spaces are not allowed inside a variable name; use `int max_hp = 100;` or `int maxHp = 100;`",
              "100 is too large for int",
              "int must be capitalized as INT",
              "Semicolon is wrong",
            ],
            ur: [
              "Variable ke naam ke darmiyan space nahi aa sakti; `int max_hp = 100;` ya `int maxHp = 100;` likhein",
              "100 int ke liye bohot bada hai",
              "int ko INT likhna chahiye",
              "Semicolon ghalat hai",
            ],
          },
          correct: 0,
          exp: {
            en: "C++ identifiers cannot contain spaces. Connect words with an underscore (`max_hp`) or camelCase (`maxHp`).",
            ur: "C++ variable ke naam mein space mana hai. Lafzon ko underscore (`max_hp`) ya camelCase (`maxHp`) se jorein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `cout << CritDmg;` fail with `'CritDmg' was not declared in this scope`?",
            ur: "BUG BREAKER: `cout << CritDmg;` par `'CritDmg' was not declared` ka error kyun aata hai?",
          },
          code: `int critDmg = 250;\ncout << CritDmg;`,
          options: {
            en: [
              "C++ is case-sensitive: `critDmg` starts with a lowercase `c`, not an uppercase `C` (`CritDmg`)",
              "250 must be a double",
              "cout cannot print variables",
              "int cannot be named critDmg",
            ],
            ur: [
              "C++ case-sensitive hai: line 1 mein chhota `c` (`critDmg`) hai jabke line 2 mein capital `C` (`CritDmg`) likha gaya hai",
              "250 ko double hona chahiye",
              "cout variable print nahi kar sakta",
              "int ka naam critDmg nahi ho sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "C++ identifiers are strictly case-sensitive. `critDmg` and `CritDmg` are distinct names.",
            ur: "C++ mein chhote aur bade harf alag hote hain; `critDmg` ko bilkul usi spelling se call karein.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Fix `int 1st_rank = 1;` by declaring `int rank_1 = 1;`.",
            ur: "ULTIMATE TERMINAL: Ghalat naam ko theek karke C++ mein `int rank_1 = 1;` declare karein.",
          },
          code: `// Declare valid integer variable rank_1 equal to 1:`,
          placeholder: "int rank_1 = 1;",
          acceptedAnswers: ["int rank_1 = 1;", "int rank_1 = 1", "int rank_1=1;", "int rank_1=1"],
          hint: {
            en: "Type: int rank_1 = 1;",
            ur: "Yeh type karein: int rank_1 = 1;",
          },
          exp: {
            en: "`int rank_1 = 1;` starts with a letter and places the digit at the end, satisfying C++ identifier rules.",
            ur: "`int rank_1 = 1;` harf se shuru hota hai jo C++ ke qanoon ke mutabiq bilkul sahi hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Output the variable `max_hp` using `cout`.",
            ur: "ULTIMATE TERMINAL: Variable `max_hp` ko `cout` ke zariye print karein.",
          },
          code: `int max_hp = 500;\n// Output max_hp using cout:`,
          placeholder: "cout << max_hp;",
          acceptedAnswers: ["cout << max_hp;", "cout << max_hp", "std::cout << max_hp;", "std::cout << max_hp"],
          hint: {
            en: "Type: cout << max_hp;",
            ur: "Yeh type karein: cout << max_hp;",
          },
          exp: {
            en: "`cout << max_hp;` outputs `500` using the exact snake_case identifier.",
            ur: "`cout << max_hp;` sahi variable naam istemal karke `500` print karta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 7 — Data Types: int, double, string (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 7,
      gateRank: "B-Rank",
      enemyName: "MEMORY BEHEMOTH",
      topic: {
        en: "Level 7 — Data Types (int, double, string)",
        ur: "Level 7 — Data Types (int, double, string)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which C++ data type is designed to store decimal (floating-point) numbers like `99.5`?",
            ur: "C++ mein `99.5` jaise point (ashariya) wale numbers store karne ke liye kaunsi data type istemal hoti hai?",
          },
          code: `double critMultiplier = 99.5;`,
          options: {
            en: ["double", "int", "string", "bool"],
            ur: ["double", "int", "string", "bool"],
          },
          correct: 0,
          exp: {
            en: "`double` stores double-precision floating-point numbers with decimals like `99.5`.",
            ur: "C++ mein point wale numbers mehfooz karne ke liye `double` data type istemal hoti hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "Which C++ data type stores text sequences like `\"Pointer Greatsword\"`?",
            ur: "C++ mein `\"Pointer Greatsword\"` jaisa text store karne ke liye kaunsi data type lagti hai?",
          },
          code: `string blade = "Pointer Greatsword";`,
          options: {
            en: ["string", "int", "double", "bool"],
            ur: ["string", "int", "double", "bool"],
          },
          correct: 0,
          exp: {
            en: "`string` (`std::string`) stores sequences of characters wrapped in double quotes.",
            ur: "C++ mein text save karne ke liye `string` (`std::string`) data type istemal ki jati hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: What happens when you assign `3.9` to an `int` variable `int dmg = 3.9;` in C++?",
            ur: "BUG BREAKER: Agar C++ mein `int dmg = 3.9;` likha jaye to `dmg` mein kya save hoga?",
          },
          code: `int dmg = 3.9;\ncout << dmg;`,
          options: {
            en: [
              "`dmg` truncates the `.9` decimal and stores `3` because `int` can only hold whole numbers; use `double dmg = 3.9;`",
              "`dmg` rounds up to `4`",
              "`dmg` stores `\"3.9\"` as text",
              "It deletes the variable",
            ],
            ur: [
              "`int` sirf poore numbers rakhta hai is liye `.9` kat jayega aur `3` save hoga; point ke liye `double dmg = 3.9;` use karein",
              "`dmg` round ho kar `4` ban jayega",
              "`dmg` text `\"3.9\"` ban jayega",
              "Variable delete ho jayega",
            ],
          },
          correct: 0,
          exp: {
            en: "Storing a decimal in an `int` truncates the fractional part without rounding (`3.9` -> `3`). Use `double` to preserve decimals.",
            ur: "`int` mein point wali value rakhne se point ke baad ka hissa kat jata hai (`3`). Point bachane ke liye `double` lagayein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `int rank = \"S\";` fail with a type conversion error in C++?",
            ur: "BUG BREAKER: C++ mein `int rank = \"S\";` likhne par compiler error kyun aata hai?",
          },
          code: `// Type mismatch bug\nint rank = "S";`,
          options: {
            en: [
              "`\"S\"` is a string literal and cannot be stored in an `int`; declare `string rank = \"S\";` instead",
              "S must be lowercase",
              "Missing semicolon",
              "int cannot be named rank",
            ],
            ur: [
              "`\"S\"` ek string hai jo `int` mein save nahi ho sakti; iske liye `string rank = \"S\";` likhein",
              "S chhota hona chahiye",
              "Semicolon missing hai",
              "int ka naam rank nahi ho sakta",
            ],
          },
          correct: 0,
          exp: {
            en: "C++ enforces strict static types: a text literal `\"S\"` requires `string rank = \"S\";`.",
            ur: "C++ mein text `\"S\"` ko `int` mein nahi rakh sakte; uske liye `string rank = \"S\";` likhna zaroori hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Declare a `double` variable named `crit` equal to `2.5` in C++.",
            ur: "ULTIMATE TERMINAL: C++ mein `double` type ka variable `crit` banayein aur usay `2.5` value dein.",
          },
          code: `// Declare double crit equal to 2.5:`,
          placeholder: "double crit = 2.5;",
          acceptedAnswers: ["double crit = 2.5;", "double crit = 2.5", "double crit=2.5;", "double crit=2.5"],
          hint: {
            en: "Type: double crit = 2.5;",
            ur: "Yeh type karein: double crit = 2.5;",
          },
          exp: {
            en: "`double crit = 2.5;` stores the floating-point multiplier `2.5` with full decimal precision.",
            ur: "`double crit = 2.5;` point wali value `2.5` ko poori durustgi ke sath save karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Declare a `string` variable named `guild` equal to `\"CPP\"`.",
            ur: "ULTIMATE TERMINAL: C++ mein `string` variable `guild` banayein aur usay `\"CPP\"` value dein.",
          },
          code: `// Declare string guild equal to "CPP":`,
          placeholder: 'string guild = "CPP";',
          acceptedAnswers: [
            'string guild = "CPP";',
            'string guild = "CPP"',
            'std::string guild = "CPP";',
            'std::string guild = "CPP"',
          ],
          hint: {
            en: 'Type: string guild = "CPP";',
            ur: 'Yeh type karein: string guild = "CPP";',
          },
          exp: {
            en: "`string guild = \"CPP\";` creates a C++ string variable holding `\"CPP\"`.",
            ur: "`string guild = \"CPP\";` C++ mein `guild` naam ka string variable bana kar `\"CPP\"` save karta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 8 — Booleans and Comparisons: true / false (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 8,
      gateRank: "B-Rank",
      enemyName: "LOGIC SENTINEL",
      topic: {
        en: "Level 8 — Booleans and Comparisons (true / false)",
        ur: "Level 8 — Booleans aur Muqabla Operators (true / false)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "Which keyword declares a Boolean variable in C++, and what are its two lowercase values?",
            ur: "C++ mein Boolean variable kis keyword se banta hai aur uski do values kya hain?",
          },
          code: `bool isAwakened = true;\nbool isDefeated = false;`,
          options: {
            en: [
              "`bool` with lowercase `true` and `false`",
              "`boolean` with `True` and `False`",
              "`bit` with `yes` and `no`",
              "`int` with `\"true\"` and `\"false\"`",
            ],
            ur: [
              "`bool` keyword aur chhote harfon mein `true` aur `false`",
              "`boolean` keyword aur `True` / `False`",
              "`bit` keyword aur `yes` / `no`",
              "`int` keyword aur `\"true\"` / `\"false\"`",
            ],
          },
          correct: 0,
          exp: {
            en: "C++ uses the `bool` type keyword and lowercase `true` / `false` literals.",
            ur: "C++ mein Boolean ke liye `bool` type aur lowercase `true` / `false` istemal hote hain.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "By default, what does `cout << (100 > 50);` print to the C++ console?",
            ur: "C++ mein `cout << (100 > 50);` default taur par screen par kya print karta hai?",
          },
          code: `cout << (100 > 50);`,
          options: {
            en: [
              "`1` (because C++ prints `1` for `true` and `0` for `false` by default)",
              "`0`",
              "`100`",
              "`50`",
            ],
            ur: [
              "`1` (kyunke C++ mein `cout` default taur par `true` ke liye `1` aur `false` ke liye `0` dikhata hai)",
              "`0`",
              "`100`",
              "`50`",
            ],
          },
          correct: 0,
          exp: {
            en: "Since `100 > 50` is `true`, `cout` outputs `1` (`true` is `1` and `false` is `0` in C++ streams unless `boolalpha` is set).",
            ur: "C++ mein `100 > 50` sach (`true`) hai, aur `cout` sach ke liye `1` aur jhoot ke liye `0` print karta hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does `bool bossAlive = True;` fail to compile in C++?",
            ur: "BUG BREAKER: C++ mein `bool bossAlive = True;` compile kyun nahi hota?",
          },
          code: `bool bossAlive = True;`,
          options: {
            en: [
              "C++ requires lowercase `true` (`bool bossAlive = true;`), not capitalized `True`",
              "bool must be spelled boolean",
              "Missing quotes around True",
              "Semicolon is not allowed",
            ],
            ur: [
              "C++ mein chhote harfon mein `true` likhna zaroori hai (`bool bossAlive = true;`), capital `True` nahi",
              "bool ko boolean likhna chahiye",
              "True ke gird quotes lagayein",
              "Semicolon mana hai",
            ],
          },
          correct: 0,
          exp: {
            en: "In C++, boolean literals are strictly lowercase `true` and `false`.",
            ur: "C++ mein `true` aur `false` hamesha chhote harfon (lowercase) mein likhe jate hain.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Which C++ operator tests whether two values are NOT equal?",
            ur: "BUG BREAKER: C++ mein yeh check karne ke liye ke do values barabar NAHI hain, kaunsa operator lagta hai?",
          },
          code: `int hp = 85;\n// Check if hp is NOT equal to 0\ncout << (hp != 0);`,
          options: {
            en: [
              "`!=` (not equal operator)",
              "`<>`",
              "`=!`",
              "`==`",
            ],
            ur: [
              "`!=` (not equal operator)",
              "`<>`",
              "`=!`",
              "`==`",
            ],
          },
          correct: 0,
          exp: {
            en: "`!=` evaluates to `true` (`1`) when the left and right operands are not equal.",
            ur: "`!=` ka matlab 'barabar nahi' hai. Jab dono values mukhtalif hon to yeh `true` deta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Declare a `bool` variable named `ready` and set it to `true`.",
            ur: "ULTIMATE TERMINAL: C++ mein `bool` variable `ready` banayein aur usay `true` value dein.",
          },
          code: `// Declare bool ready equal to true:`,
          placeholder: "bool ready = true;",
          acceptedAnswers: ["bool ready = true;", "bool ready = true", "bool ready=true;", "bool ready=true"],
          hint: {
            en: "Type: bool ready = true;",
            ur: "Yeh type karein: bool ready = true;",
          },
          exp: {
            en: "`bool ready = true;` declares a boolean variable initialized to `true`.",
            ur: "`bool ready = true;` C++ mein `ready` naam ka Boolean variable bana kar `true` save karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the C++ comparison expression to check if `xp` is greater than or equal to `500`.",
            ur: "ULTIMATE TERMINAL: Check karein ke `xp` bada ya barabar hai `500` ke (`xp >= 500`).",
          },
          code: `int xp = 500;\n// Type comparison for xp at least 500:`,
          placeholder: "xp >= 500",
          acceptedAnswers: ["xp >= 500", "xp>=500", "xp >= 500;", "(xp >= 500)"],
          hint: {
            en: "Type: xp >= 500",
            ur: "Yeh type karein: xp >= 500",
          },
          exp: {
            en: "`xp >= 500` checks if `xp` has reached the S-Rank threshold of `500`!",
            ur: "`xp >= 500` check karta hai ke `xp` `500` ya us se zyada hai!",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 9 — Conditional Logic: if / else (6 Questions)
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 9,
      gateRank: "A-Rank",
      enemyName: "GUARDIAN ARCHON",
      topic: {
        en: "Level 9 — Conditional Logic (if / else)",
        ur: "Level 9 — Shartiya Logic (if / else)",
      },
      isBoss: false,
      questions: [
        {
          attackType: "light",
          q: {
            en: "What will this C++ `if / else` block output when `rage = 90`?",
            ur: "Jab `rage = 90` ho to yeh C++ `if / else` code kya print karega?",
          },
          code: `int rage = 90;\nif (rage >= 100) {\n    cout << "Berserk";\n} else {\n    cout << "Charging";\n}`,
          options: {
            en: ["Berserk", "Charging", "90", "Nothing"],
            ur: ["Berserk", "Charging", "90", "Kuch nahi"],
          },
          correct: 1,
          exp: {
            en: "`90 >= 100` is `false`, so the `else` block runs and outputs `Charging`.",
            ur: "Kyunke `90 >= 100` ghalat (`false`) hai, `else` wala hissa chalta hai aur `Charging` print hota hai.",
          },
        },
        {
          attackType: "light",
          q: {
            en: "How do you write an additional condition branch between `if` and `else` in C++?",
            ur: "C++ mein `if` aur `else` ke darmiyan ek aur shart lagane ke liye kya likha jata hai?",
          },
          code: `if (xp >= 500) {\n    cout << "S";\n} else if (xp >= 300) {\n    cout << "A";\n}`,
          options: {
            en: ["else if (condition)", "elif (condition)", "when (condition)", "otherwise (condition)"],
            ur: ["else if (condition)", "elif (condition)", "when (condition)", "otherwise (condition)"],
          },
          correct: 0,
          exp: {
            en: "C++ uses `else if (condition) { ... }` to chain multiple conditional checks.",
            ur: "C++ mein doosri shart check karne ke liye `else if (condition)` istemal hota hai.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why is `if (hp = 0)` a critical logic bug in C++?",
            ur: "BUG BREAKER: C++ mein `if (hp = 0)` likhna ek khatarnak logic bug kyun hai?",
          },
          code: `int hp = 100;\nif (hp = 0) {\n    cout << "Defeated";\n}`,
          options: {
            en: [
              "Single `=` overwrites `hp` with `0` instead of comparing; use double equals `if (hp == 0)`",
              "0 is not an integer",
              "Curly braces are not allowed in C++",
              "hp must be a string",
            ],
            ur: [
              "Single `=` muqabla karne ke bajaye `hp` ko `0` bana deta hai; barabari check karne ke liye `if (hp == 0)` lagayein",
              "0 integer nahi hai",
              "C++ mein curly braces mana hain",
              "hp ko string hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "`hp = 0` assigns `0` to `hp` (destroying your HP!). Always use `==` (`if (hp == 0)`) to compare values.",
            ur: "`hp = 0` aapki `hp` ko mita kar `0` kar deta hai! Muqable ke liye hamesha `==` (`if (hp == 0)`) istemal karein.",
          },
        },
        {
          attackType: "heavy",
          q: {
            en: "BUG BREAKER: Why does putting a semicolon right after `if (atk > 50);` break the conditional logic?",
            ur: "BUG BREAKER: `if (atk > 50);` ke foran baad semicolon `;` lagane se logic kyun kharab ho jati hai?",
          },
          code: `int atk = 10;\nif (atk > 50);\n{\n    cout << "Heavy Cleave";\n}`,
          options: {
            en: [
              "The stray semicolon `;` ends the `if` statement early as an empty statement, so `{ cout << \"Heavy Cleave\"; }` runs unconditionally!",
              "Semicolons delete variables",
              "atk > 50 is always true",
              "Curly braces cause a syntax error",
            ],
            ur: [
              "`if (atk > 50);` ke baad `;` lagane se `if` wahin khatam ho jata hai aur neeche wala `{ cout << \"Heavy Cleave\"; }` har haal mein chal parta hai!",
              "Semicolon variable mita deta hai",
              "atk > 50 hamesha true hota hai",
              "Curly braces error deti hain",
            ],
          },
          correct: 0,
          exp: {
            en: "Never place a semicolon immediately after `if (condition)`. It terminates the `if` with an empty body.",
            ur: "`if (condition)` ke foran baad kabhi semicolon `;` na lagayein warna `if` ki shart be-asar ho jati hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type the C++ `if` header checking if `hp == 100` with an opening brace `{`.",
            ur: "ULTIMATE TERMINAL: C++ mein `if (hp == 100) {` header type karein.",
          },
          code: `// Write the C++ if header checking if hp equals 100:`,
          placeholder: "if (hp == 100) {",
          acceptedAnswers: ["if (hp == 100) {", "if(hp==100){", "if (hp == 100)"],
          hint: {
            en: "Type: if (hp == 100) {",
            ur: "Yeh type karein: if (hp == 100) {",
          },
          exp: {
            en: "`if (hp == 100) {` tests equality with `==` inside parentheses and opens the C++ block with `{`.",
            ur: "`if (hp == 100) {` parentheses mein `==` se barabari check karke `{` block shuru karta hai.",
          },
        },
        {
          attackType: "ultimate",
          q: {
            en: "ULTIMATE TERMINAL: Type `else {` to start the else branch in C++.",
            ur: "ULTIMATE TERMINAL: C++ mein else block shuru karne ke liye `else {` type karein.",
          },
          code: `if (hp > 0) {\n    cout << "Alive";\n}\n// Start the else branch:`,
          placeholder: "else {",
          acceptedAnswers: ["else {", "else{", "} else {", "}else{"],
          hint: {
            en: "Type: else {",
            ur: "Yeh type karein: else {",
          },
          exp: {
            en: "`else {` opens the fallback block executed when `hp > 0` evaluates to `false`.",
            ur: "`else {` woh block kholta hai jo `if` ki shart ghalat hone par chalta hai.",
          },
        },
      ],
    }),

    /* ----------------------------------------------------------------------
       C++ LEVEL 10 — S-RANK BOSS FIGHT: S-RANK MEMORY LEVIATHAN: BERU-CPP
       12-Question Boss Gauntlet | 15s Timer | All 3 Attack Types
       ---------------------------------------------------------------------- */
    makeLevel({
      level: 10,
      gateRank: "S-Rank BOSS",
      enemyName: "S-RANK MEMORY LEVIATHAN: BERU-CPP",
      topic: {
        en: "Level 10 — S-RANK BOSS GAUNTLET: BERU-CPP",
        ur: "Level 10 — S-RANK BOSS MUQABLA: BERU-CPP",
      },
      isBoss: true,
      timer: 15,
      bossTaunts: [
        {
          en: "BERU-CPP: 'SCREEEECH! Swing your Pointer Greatsword, Hunter! My memory carapace has zero weakness!'",
          ur: "BERU-CPP: 'SCREEEECH! Apni Pointer Greatsword chalao Hunter! Mere memory armor mein koi kamzori nahi!'",
        },
        {
          en: "BERU-CPP: 'One missing semicolon or type error and I will devour your stack frame!'",
          ur: "BERU-CPP: 'Ek semicolon ya type ki ghalti aur main tumhara stack frame nigal jaunga!'",
        },
        {
          en: "BERU-CPP: 'Show me if a C++ Berserker Monarch can cleave an Ant King!'",
          ur: "BERU-CPP: 'Mujhe dikhao ke kya C++ Berserker Monarch ek Ant King ko hara sakta hai!'",
        },
      ],
      victoryDialogue: {
        en: "BERU-CPP: 'My carapace is shattered... My liege, Ant King Beru-CPP pledges eternal loyalty! Command me: ARISE!'",
        ur: "BERU-CPP: 'Mera armor toot gaya... Mere आقا, Ant King Beru-CPP hamesha aapki wafadari karega! Hukm dein: ARISE!'",
      },
      defeatDialogue: {
        en: "BERU-CPP: 'Your C++ strikes lack compile-time precision! Reforge your Greatsword and return!'",
        ur: "BERU-CPP: 'Tumhare C++ hamalon mein abhi pukhtagi nahi! Dobara tayyari karke maidan mein aao!'",
      },
      questions: [
        {
          attackType: "light",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 1! Test your stream output against my claws!'",
            ur: "BERU-CPP: 'Pehla War! Mere panjon ke samne apna `cout` output aazmao!'",
          },
          q: {
            en: "BOSS STRIKE 1/12: What will this C++ code output?",
            ur: "BOSS STRIKE 1/12: Yeh C++ code kya print karega?",
          },
          code: `string boss = "BERU-CPP";\ncout << "King: " << boss;`,
          options: {
            en: ["King: BERU-CPP", "King: boss", "King:<<boss", "Compile Error"],
            ur: ["King: BERU-CPP", "King: boss", "King:<<boss", "Compile Error"],
          },
          correct: 0,
          exp: {
            en: "Chaining `<<` streams `\"King: \"` followed immediately by the value of `boss` (`\"BERU-CPP\"`).",
            ur: "`<<` ke zariye pehle `\"King: \"` aur phir `boss` ki value `BERU-CPP` print hoti hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 2! You reversed the stream operator!'",
            ur: "BERU-CPP: 'Doosra War! Tumne stream operator ulta laga diya!'",
          },
          q: {
            en: "BOSS STRIKE 2/12 — BUG BREAKER: Why does `cout >> \"Roar\";` fail to compile?",
            ur: "BOSS STRIKE 2/12 — BUG BREAKER: C++ mein `cout >> \"Roar\";` compile kyun nahi hota?",
          },
          code: `cout >> "Roar";`,
          options: {
            en: [
              "`cout` requires the insertion operator `<<` (`cout << \"Roar\";`), not `>>`",
              "Roar must be an integer",
              "Semicolon is missing",
              "cout must be uppercase",
            ],
            ur: [
              "`cout` ke sath `<<` operator lagta hai (`cout << \"Roar\";`), `>>` nahi",
              "Roar integer hona chahiye",
              "Semicolon missing hai",
              "cout capital hona chahiye",
            ],
          },
          correct: 0,
          exp: {
            en: "`cout` always uses `<<` pointing toward `cout` (`cout << \"Roar\";`). `>>` is only for `cin` input.",
            ur: "`cout` ke sath hamesha `<<` lagta hai (`cout << \"Roar\";`). `>>` sirf `cin` ke liye hota hai.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 3! Cut through my decoy comment swarm!'",
            ur: "BERU-CPP: 'Teesra War! Mere comment ke jaal ko kaat kar sahi jawab do!'",
          },
          q: {
            en: "BOSS STRIKE 3/12: What value of `cleave` is printed to `cout`?",
            ur: "BOSS STRIKE 3/12: `cout` par `cleave` ki kya value print hogi?",
          },
          code: `int cleave = 60;\n// cleave = 0;\n/* cleave += 500; */\ncleave += 40;\ncout << cleave;`,
          options: {
            en: ["60", "100", "560", "0"],
            ur: ["60", "100", "560", "0"],
          },
          correct: 1,
          exp: {
            en: "Lines 2 and 3 are commented out. `cleave` starts at `60` and `cleave += 40;` raises it to `100`.",
            ur: "Line 2 aur 3 comments hain. `60` mein `40` jama hone se `100` print hoga.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 4! Your identifier violates C++ laws!'",
            ur: "BERU-CPP: 'Chautha War! Tumhara variable naam C++ qanoon ke khilaf hai!'",
          },
          q: {
            en: "BOSS STRIKE 4/12 — BUG BREAKER: Which C++ variable declaration is INVALID?",
            ur: "BOSS STRIKE 4/12 — BUG BREAKER: In mein se kaunsa C++ variable naam GHALAT hai?",
          },
          code: `int shadow_count = 10;\nint double = 20;\nint maxRage = 100;`,
          options: {
            en: [
              "Line 1 (`shadow_count`)",
              "Line 2 (`double` is a reserved C++ data-type keyword and cannot be a variable name)",
              "Line 3 (`maxRage`)",
              "All three are valid",
            ],
            ur: [
              "Line 1 (`shadow_count`)",
              "Line 2 (`double` C++ ka reserved keyword hai, yeh variable ka naam nahi ho sakta)",
              "Line 3 (`maxRage`)",
              "Teeno sahi hain",
            ],
          },
          correct: 1,
          exp: {
            en: "`double` is a built-in C++ type keyword and cannot be used as an identifier name.",
            ur: "`double` C++ ki apni data type ka keyword hai, is liye kisi variable ka naam `double` nahi rakh sakte.",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 5! Forge your Greatsword power in live C++ code!'",
            ur: "BERU-CPP: 'Panchwan War! Live C++ code likh kar apni Greatsword ko taqat do!'",
          },
          q: {
            en: "BOSS STRIKE 5/12 — ULTIMATE: Declare `int power = 900;` in C++.",
            ur: "BOSS STRIKE 5/12 — ULTIMATE: C++ mein `int power = 900;` declare karein.",
          },
          code: `// Declare integer power equal to 900:`,
          placeholder: "int power = 900;",
          acceptedAnswers: ["int power = 900;", "int power = 900", "int power=900;", "int power=900"],
          hint: {
            en: "Type: int power = 900;",
            ur: "Yeh type karein: int power = 900;",
          },
          exp: {
            en: "HEAVY CLEAVE! `int power = 900;` locks 900 raw attack power into your Greatsword!",
            ur: "ZABARDAST WAR! `int power = 900;` ne aapki talwar mein 900 power bhar di!",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 6! Match every value to its exact C++ static type!'",
            ur: "BERU-CPP: 'Chhata War! Har value ki sahi C++ data type batao!'",
          },
          q: {
            en: "BOSS STRIKE 6/12: Which types match `100`, `4.75`, and `\"Beru\"` in C++?",
            ur: "BOSS STRIKE 6/12: C++ mein `100`, `4.75`, aur `\"Beru\"` ke liye tarteeb-waar kaunsi types lagti hain?",
          },
          code: `int a = 100;\ndouble b = 4.75;\nstring c = "Beru";`,
          options: {
            en: [
              "int, double, string",
              "double, int, string",
              "number, float, str",
              "string, double, int",
            ],
            ur: [
              "int, double, string",
              "double, int, string",
              "number, float, str",
              "string, double, int",
            ],
          },
          correct: 0,
          exp: {
            en: "In C++, `int` stores whole numbers (`100`), `double` stores decimals (`4.75`), and `string` stores text (`\"Beru\"`).",
            ur: "C++ mein poore number ke liye `int`, point wale ke liye `double`, aur text ke liye `string` lagta hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 7! Why did your integer division lose damage?'",
            ur: "BERU-CPP: 'Satwan War! Tumhari integer division mein damage kam kyun ho gaya?'",
          },
          q: {
            en: "BOSS STRIKE 7/12 — BUG BREAKER: What does `cout << 15 / 4;` output in C++?",
            ur: "BOSS STRIKE 7/12 — BUG BREAKER: C++ mein `cout << 15 / 4;` kya output dega?",
          },
          code: `cout << 15 / 4;`,
          options: {
            en: [
              "`3` (because `15` and `4` are integers, so `.75` is truncated from `3.75`)",
              "`3.75`",
              "`4`",
              "`154`",
            ],
            ur: [
              "`3` (kyunke `15` aur `4` dono `int` hain, is liye `3.75` ka `.75` kat kar `3` reh jata hai)",
              "`3.75`",
              "`4`",
              "`154`",
            ],
          },
          correct: 0,
          exp: {
            en: "Integer division `15 / 4` drops the remainder and outputs `3`. Use `15.0 / 4.0` to get `3.75`.",
            ur: "Do `int` numbers ki division mein point ke baad wala hissa kat jata hai, is liye `15 / 4` se `3` aata hai.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 8! Evaluate my boolean exoskeleton!'",
            ur: "BERU-CPP: 'Aathwan War! Mere Boolean armor ka jawab do!'",
          },
          q: {
            en: "BOSS STRIKE 8/12: What is the boolean result of `(200 >= 200)` in C++?",
            ur: "BOSS STRIKE 8/12: C++ mein `(200 >= 200)` ka Boolean natija kya hai?",
          },
          code: `bool hit = (200 >= 200);`,
          options: {
            en: ["true", "false", "200", "null"],
            ur: ["true", "false", "200", "null"],
          },
          correct: 0,
          exp: {
            en: "Since `200` is equal to `200`, `200 >= 200` evaluates to `true`.",
            ur: "Kyunke `200` barabar hai `200` ke, is liye `200 >= 200` ka jawab `true` hai.",
          },
        },
        {
          attackType: "heavy",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 9! Your conditional block failed to compile!'",
            ur: "BERU-CPP: 'Nawan War! Tumhara `if` code compile nahi ho saka!'",
          },
          q: {
            en: "BOSS STRIKE 9/12 — BUG BREAKER: Why does `if xp > 300 {` fail to compile in C++?",
            ur: "BOSS STRIKE 9/12 — BUG BREAKER: C++ mein `if xp > 300 {` par compile error kyun aata hai?",
          },
          code: `int xp = 400;\nif xp > 300 {\n    cout << "A-Rank";\n}`,
          options: {
            en: [
              "C++ requires parentheses around the condition: `if (xp > 300) {`",
              "Curly braces `{` are not allowed in C++",
              "xp must be a string",
              "Use colon `:` instead of `{`",
            ],
            ur: [
              "C++ mein `if` ki shart ko parentheses `( )` mein band karna lazmi hai: `if (xp > 300) {`",
              "C++ mein `{` lagana mana hai",
              "xp ko string hona chahiye",
              "`{` ki jagah colon `:` lagayein",
            ],
          },
          correct: 0,
          exp: {
            en: "Unlike Python, C++ always requires parentheses around an `if` condition: `if (xp > 300) {`.",
            ur: "Python ke baraks C++ mein `if` ki condition hamesha brackets `(xp > 300)` ke andar likhi jati hai.",
          },
        },
        {
          attackType: "light",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 10! Predict the path of my Berserker conditional!'",
            ur: "BERU-CPP: 'Daswan War! Is `if / else if / else` ka sahi output batao!'",
          },
          q: {
            en: "BOSS STRIKE 10/12: What will this C++ conditional ladder print?",
            ur: "BOSS STRIKE 10/12: Yeh C++ conditional code kya print karega?",
          },
          code: `int xp = 180;\nif (xp >= 500) {\n    cout << "S-Rank";\n} else if (xp >= 150) {\n    cout << "C-Rank";\n} else {\n    cout << "E-Rank";\n}`,
          options: {
            en: ["S-Rank", "C-Rank", "E-Rank", "Nothing"],
            ur: ["S-Rank", "C-Rank", "E-Rank", "Kuch nahi"],
          },
          correct: 1,
          exp: {
            en: "`180 >= 500` is `false`, so C++ checks `else if (xp >= 150)`, which is `true`, outputting `C-Rank`.",
            ur: "Pehli shart ghalat hai magar doosri shart `180 >= 150` sach hai, is liye `C-Rank` print hoga.",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "BERU-CPP: 'Strike 11! My carapace is cracking! Double your strike power in the terminal!'",
            ur: "BERU-CPP: 'Gyarhwan War! Mera khol toot raha hai! Terminal mein apni taqat dugni karo!'",
          },
          q: {
            en: "BOSS STRIKE 11/12 — ULTIMATE: Multiply `dmg` by `2` using `*=` in C++ (`dmg *= 2;`).",
            ur: "BOSS STRIKE 11/12 — ULTIMATE: C++ mein `*=` operator se `dmg` ko `2` se multiply karein (`dmg *= 2;`).",
          },
          code: `int dmg = 500;\n// Multiply dmg by 2 using *=:`,
          placeholder: "dmg *= 2;",
          acceptedAnswers: ["dmg *= 2;", "dmg *= 2", "dmg*=2;", "dmg*=2", "dmg = dmg * 2;", "dmg = dmg * 2"],
          hint: {
            en: "Type: dmg *= 2;",
            ur: "Yeh type karein: dmg *= 2;",
          },
          exp: {
            en: "BERSERKER CRITICAL! `dmg *= 2;` boosts your Greatsword impact to `1000`, shattering BERU-CPP's armor!",
            ur: "BERSERKER DHAMAKA! `dmg *= 2;` ne aapke waar ko `1000` tak pohancha kar BERU-CPP ka armor tod diya!",
          },
        },
        {
          attackType: "ultimate",
          bossTaunt: {
            en: "BERU-CPP: 'FINAL STRIKE 12/12! SCREEEECH! Speak the Sovereign's word and command my shadow!'",
            ur: "BERU-CPP: 'AAKHRI WAR 12/12! SCREEEECH! Badshah ka lafz likho aur mere Shadow ko hukm do!'",
          },
          q: {
            en: "🌌 BOSS FINISHER 12/12 — ULTIMATE: Type `cout << \"ARISE\";` to conquer BERU-CPP and extract Ant King Beru-CPP!",
            ur: "🌌 BOSS FINISHER 12/12 — ULTIMATE: BERU-CPP ko fatah karne ke liye `cout << \"ARISE\";` type karein!",
          },
          code: `// Deliver the Final Berserker Monarch Finisher:`,
          placeholder: 'cout << "ARISE";',
          acceptedAnswers: [
            'cout << "ARISE";',
            'cout << "ARISE"',
            'std::cout << "ARISE";',
            'std::cout << "ARISE"',
            'cout << "Arise";',
            'cout << "Arise"',
          ],
          hint: {
            en: 'Type: cout << "ARISE";',
            ur: 'Yeh type karein: cout << "ARISE";',
          },
          exp: {
            en: "🌌 S-RANK MEMORY LEVIATHAN CONQUERED! `cout << \"ARISE\";` extracts Ant King Beru-CPP into your Shadow Legion!",
            ur: "🌌 S-RANK MEMORY LEVIATHAN FATAH HO GAYA! `cout << \"ARISE\";` ne Ant King Beru-CPP ko aapki Shadow Army mein shamil kar diya!",
          },
        },
      ],
    }),
  ];

  const CPP_ALL_LEVELS = CPP_LEVELS_1_TO_5.concat(CPP_LEVELS_6_TO_10);

  /* ========================================================================
     10. THREE PLAYABLE HUNTER CLASSES (GameData.classes & PYQUEST_DATA.CLASSES)
     ======================================================================== */
  const CLASSES = {
    python: {
      id: "python",
      icon: "🐍",
      name: bi("🐍 Shadow Necromancer", "🐍 Shadow Necromancer"),
      title: bi("Python — Shadow Necromancer", "Python — Shadow Necromancer"),
      identity: bi("🐍 Shadow Necromancer", "🐍 Shadow Necromancer"),
      guild: bi("Python Guild", "Python Guild"),
      description: bi(
        "Master of clean syntax, AI spellcraft, and shadow automation. Commands undead code legions with expressive Python logic.",
        "Saaf syntax, AI jadu aur shadow automation ka mahir. Python ki taqatwar logic se Shadow fauj par hukmarani karta hai."
      ),
      themeColor: "#00f3ff",
      weapon: bi("Serpent Shadow Katana", "Serpent Shadow Katana"),
      weaponName: "Serpent Shadow Katana",
      weaponLore: bi(
        "Forged in the Abyssal Interpreter, this cyan-glowing katana slices through corrupted indentation and compiles enemies into loyal shadows.",
        "Abyssal Interpreter mein dhalai gayi yeh neeli chamakti talwar har indentation bug ko kaat kar dushmanon ko wafadar saye mein badal deti hai."
      ),
      chapter: {
        number: 1,
        title: bi(
          "Chapter 1: Awakening of the Serpent Necromancer",
          "Chapter 1: Serpent Necromancer ki Bedari"
        ),
        description: bi(
          "Conquer Gates 1–9 from print() basics to conditional logic, then enter the Level 10 Red Gate to face IG-PY.",
          "print() se le kar if/else logic tak Gates 1–9 fatah karein aur Level 10 Red Gate mein IG-PY ka muqabla karein."
        ),
      },
      boss: {
        id: "ig_py",
        name: bi("S-RANK SYNTAX OVERLORD: IG-PY", "S-RANK SYNTAX OVERLORD: IG-PY"),
        title: bi(
          "Blood-Red Commander of the Syntax Citadel",
          "Syntax Qilay ka Surkh Commander"
        ),
        level: 10,
        timer: 15,
        timeLimit: 15,
        questionCount: 12,
        introDialogue: bi(
          "IG-PY: 'Draw your Serpent Shadow Katana, Hunter! None may pass the Red Gate with flawed Python syntax!'",
          "IG-PY: 'Apni Serpent Shadow Katana nikalo Hunter! Kamzor Python syntax ke sath koi is Red Gate se nahi guzar sakta!'"
        ),
        victoryDialogue: PYTHON_ALL_LEVELS[9].victoryDialogue,
        defeatDialogue: PYTHON_ALL_LEVELS[9].defeatDialogue,
        taunts: PYTHON_ALL_LEVELS[9].bossTaunts,
      },
      shadowReward: {
        id: "igris_py",
        name: bi("Shadow Commander Igris-Py", "Shadow Commander Igris-Py"),
        buffDesc: bi(
          "+5s Extra Boss Timer & +5 Bonus XP per Strike",
          "Boss Timer mein +5s izafa aur har Strike par +5 Bonus XP"
        ),
        bonusTime: 5,
        bonusXP: 5,
        healPerTurn: 0,
      },
      shadowBossName: "Shadow Commander Igris-Py",
      shadowBuffText: "👻 Shadow Commander Igris-Py: +5s Extra Boss Timer & +5 Bonus XP per Strike",
      levels: PYTHON_ALL_LEVELS,
    },

    javascript: {
      id: "javascript",
      icon: "⚡",
      name: bi("⚡ Cyber Assassin", "⚡ Cyber Assassin"),
      title: bi("JavaScript — Cyber Assassin", "JavaScript — Cyber Assassin"),
      identity: bi("⚡ Cyber Assassin", "⚡ Cyber Assassin"),
      guild: bi("JavaScript Guild", "JavaScript Guild"),
      description: bi(
        "High-voltage phantom of the Web Matrix. Strikes at asynchronous speed with twin daggers, strict comparisons, and dynamic execution.",
        "Web Matrix ka bijli ki raftaar wala shikari. Apne Async Twin Daggers aur strict logic se palak jhapakte hi dushman ko khatam karta hai."
      ),
      themeColor: "#f7df1e",
      weapon: bi("Async Twin Daggers", "Async Twin Daggers"),
      weaponName: "Async Twin Daggers",
      weaponLore: bi(
        "Twin high-voltage plasma blades synchronized with the Event Loop. One dagger resolves Promises while the other severs corrupted DOM nodes.",
        "Event Loop ki bijli se chalne wale do plasma khanjar jo har corrupted DOM node aur bug ko pal bhar mein kaat dete hain."
      ),
      chapter: {
        number: 1,
        title: bi(
          "Chapter 1: High-Voltage Cyber Assassination",
          "Chapter 1: High-Voltage Cyber Shikari"
        ),
        description: bi(
          "Master console.log(), let/const memory, typeof, and strict equality across Gates 1–9 before raiding VULCAN-JS.",
          "Gates 1–9 mein console.log(), let/const, typeof aur strict equality seekhein aur Level 10 mein VULCAN-JS ko shikast dein."
        ),
      },
      boss: {
        id: "vulcan_js",
        name: bi("S-RANK DOM TITAN: VULCAN-JS", "S-RANK DOM TITAN: VULCAN-JS"),
        title: bi(
          "Colossus of the High-Voltage Event Reactor",
          "High-Voltage Event Reactor ka Titan"
        ),
        level: 10,
        timer: 15,
        timeLimit: 15,
        questionCount: 12,
        introDialogue: bi(
          "VULCAN-JS: 'Welcome to my DOM Reactor, Assassin! Let us see if your Twin Daggers can survive 12 high-voltage strikes!'",
          "VULCAN-JS: 'Mere DOM Reactor mein khush aamdeed! Dekhte hain tumhare Twin Daggers mere 12 bijli ke waron ko rok pate hain ya nahi!'"
        ),
        victoryDialogue: JS_ALL_LEVELS[9].victoryDialogue,
        defeatDialogue: JS_ALL_LEVELS[9].defeatDialogue,
        taunts: JS_ALL_LEVELS[9].bossTaunts,
      },
      shadowReward: {
        id: "tusk_js",
        name: bi("High-Orc Shaman Tusk-JS", "High-Orc Shaman Tusk-JS"),
        buffDesc: bi(
          "+10% Auto-Heal on Streaks & -3 XP Shop Discount",
          "Streak par +10% Auto-Heal aur Shop mein 3 XP ki chhoot"
        ),
        bonusTime: 3,
        bonusXP: 3,
        healPerTurn: 10,
        shopDiscount: 3,
      },
      shadowBossName: "High-Orc Shaman Tusk-JS",
      shadowBuffText: "👻 High-Orc Shaman Tusk-JS: +10% Auto-Heal on Streaks & -3 XP Shop Discount",
      levels: JS_ALL_LEVELS,
    },

    cpp: {
      id: "cpp",
      icon: "⚔️",
      name: bi("⚔️ Berserker Monarch", "⚔️ Berserker Monarch"),
      title: bi("C++ — Berserker Monarch", "C++ — Berserker Monarch"),
      identity: bi("⚔️ Berserker Monarch", "⚔️ Berserker Monarch"),
      guild: bi("C++ Guild", "C++ Guild"),
      description: bi(
        "Unstoppable sovereign of raw hardware performance and static types. Cleaves through S-Rank armor with zero-overhead compiled strikes.",
        "Raw hardware speed aur static types ka be-khauf बादशाह. Zero-overhead compiled waron se S-Rank armor ke tukre kar deta hai."
      ),
      themeColor: "#ff0055",
      weapon: bi("Pointer Greatsword", "Pointer Greatsword"),
      weaponName: "Pointer Greatsword",
      weaponLore: bi(
        "A colossal crimson greatsword tempered in raw memory addresses. Every swing strikes directly at the enemy's core without abstraction.",
        "Raw memory addresses mein dhalai gayi ek azeem surkh talwar jis ka har waar seedha dushman ke memory core par lagta hai."
      ),
      chapter: {
        number: 1,
        title: bi(
          "Chapter 1: Wrath of the Iron Memory Monarch",
          "Chapter 1: Memory Monarch ka Ghazab"
        ),
        description: bi(
          "Forge your C++ mastery through cout streams, static types, and conditionals in Gates 1–9 before facing BERU-CPP.",
          "Gates 1–9 mein cout, static types aur conditionals par uboor hasil karein aur Level 10 mein BERU-CPP ka samna karein."
        ),
      },
      boss: {
        id: "beru_cpp",
        name: bi(
          "S-RANK MEMORY LEVIATHAN: BERU-CPP",
          "S-RANK MEMORY LEVIATHAN: BERU-CPP"
        ),
        title: bi(
          "Apex Sovereign of the Abyssal Memory Hive",
          "Abyssal Memory Hive ka Ant King"
        ),
        level: 10,
        timer: 15,
        timeLimit: 15,
        questionCount: 12,
        introDialogue: bi(
          "BERU-CPP: 'SCREEEECH! Swing your Pointer Greatsword with everything you have, Berserker Hunter!'",
          "BERU-CPP: 'SCREEEECH! Apni Pointer Greatsword poori taqat se chalao Berserker Hunter!'"
        ),
        victoryDialogue: CPP_ALL_LEVELS[9].victoryDialogue,
        defeatDialogue: CPP_ALL_LEVELS[9].defeatDialogue,
        taunts: CPP_ALL_LEVELS[9].bossTaunts,
      },
      shadowReward: {
        id: "beru_cpp",
        name: bi("Ant King Beru-CPP", "Ant King Beru-CPP"),
        buffDesc: bi(
          "+10 Bonus Crit XP & Enemy Damage Reduced by 5%",
          "+10 Bonus Crit XP aur Dushman ka hamla 5% kam"
        ),
        bonusTime: 4,
        bonusXP: 10,
        damageReduction: 5,
      },
      shadowBossName: "Ant King Beru-CPP",
      shadowBuffText: "👻 Ant King Beru-CPP: +10 Bonus Crit XP & Enemy Damage Reduced by 5%",
      levels: CPP_ALL_LEVELS,
    },
  };

  /* ========================================================================
     11. EXTENDED PROGRESSION GENERATOR — LEVELS 11 TO 400
     GameData.getLevelQuestions(classId, levelNum)
     - Levels 1–10: Returns the original handcrafted questions (59 per class).
     - Levels 11–400: Deterministic parameterized generator preserving the
       exact tier question count distribution:
       Step 1 -> 3 | Steps 2–5 -> 5 | Steps 6–9 -> 6 | Step 10 (Boss) -> 12
     ======================================================================== */
  const TIER_QUESTION_COUNTS = [3, 5, 5, 5, 5, 6, 6, 6, 6, 12];

  const PROGRESSION_VARS = [
    "mana",
    "atk",
    "crit",
    "rage",
    "fury",
    "combo",
    "shards",
    "souls",
    "bolts",
    "valor",
  ];

  const PROGRESSION_ENEMIES = [
    "ABYSSAL STALKER",
    "CYBER WYVERN",
    "VOID ARCHON",
    "SYNTAX HYDRA",
    "QUANTUM REAPER",
    "SHADOW CENTURION",
    "NEON BEHEMOTH",
    "CORE VALKYRIE",
    "RUNE COLOSSUS",
    "S-RANK GATE OVERLORD",
  ];

  function getRequiredQuestionCountForLevel(levelNum) {
    const safeLvl = Math.max(1, Math.min(400, Math.floor(Number(levelNum) || 1)));
    const tierIndex = (safeLvl - 1) % 10;
    return TIER_QUESTION_COUNTS[tierIndex];
  }

  /**
   * Builds a rotated 4-option array where the correct answer is placed at
   * `targetCorrectIdx` (0..3) and all 4 choices are guaranteed distinct.
   */
  function buildRotatedOptions(correctEn, wrongEnList, correctUr, wrongUrList, targetCorrectIdx) {
    const idx = ((targetCorrectIdx % 4) + 4) % 4;
    const enOut = [];
    const urOut = [];
    let wPtr = 0;
    for (let i = 0; i < 4; i++) {
      if (i === idx) {
        enOut.push(String(correctEn));
        urOut.push(String(correctUr !== undefined ? correctUr : correctEn));
      } else {
        enOut.push(String(wrongEnList[wPtr]));
        urOut.push(String((wrongUrList || wrongEnList)[wPtr]));
        wPtr++;
      }
    }
    return {
      options: makeOptions(enOut, urOut),
      correct: idx,
    };
  }

  function generateParameterizedQuestion(classId, levelNum, qIdx, totalInLevel) {
    const clsKey = CLASSES[classId] ? classId : "python";
    const chapterNum = Math.floor((levelNum - 1) / 10) + 1; // Chapters 2..40
    const tierStep = ((levelNum - 1) % 10) + 1; // 1..10
    const isBoss = tierStep === 10;
    const seed = levelNum * 37 + (qIdx + 1) * 13 + (clsKey === "python" ? 1 : clsKey === "javascript" ? 2 : 3);

    const varName = PROGRESSION_VARS[seed % PROGRESSION_VARS.length];
    const baseVal = ((levelNum * 3 + qIdx * 7) % 18) + 4; // 4..21
    const stepVal = ((levelNum + qIdx * 5) % 8) + 2; // 2..9
    const multVal = ((seed % 4) + 2); // 2..5
    const threshold = baseVal + stepVal;
    const correctSlot = (levelNum + qIdx) % 4;

    // Determine attackType: balanced mix across every level, ending with Ultimate finisher
    let attackType = "light";
    if (qIdx === totalInLevel - 1 || (isBoss && qIdx >= totalInLevel - 3)) {
      attackType = "ultimate";
    } else if (qIdx % 3 === 1) {
      attackType = "heavy";
    } else if (qIdx % 3 === 2 && totalInLevel >= 6 && qIdx === 2) {
      attackType = "ultimate";
    }

    const prefixTag = isBoss
      ? `BOSS STRIKE ${qIdx + 1}/${totalInLevel} [CH.${chapterNum}]: `
      : `GATE ${levelNum} (CH.${chapterNum} STRIKE ${qIdx + 1}/${totalInLevel}): `;
    const prefixTagUr = isBoss
      ? `BOSS WAR ${qIdx + 1}/${totalInLevel} [CH.${chapterNum}]: `
      : `GATE ${levelNum} (CH.${chapterNum} WAR ${qIdx + 1}/${totalInLevel}): `;

    const bossTaunt = isBoss
      ? {
          en: `CH.${chapterNum} OVERLORD: 'Strike ${qIdx + 1}! My Tier-${chapterNum} barrier scales to Level ${levelNum}!'`,
          ur: `CH.${chapterNum} OVERLORD: 'War ${qIdx + 1}! Meri Tier-${chapterNum} shield Level ${levelNum} ki taqat rakhti hai!'`,
        }
      : undefined;

    /* ----------------------------------------------------------------------
       ULTIMATE ATTACK TEMPLATES (LEVELS 11–400)
       ---------------------------------------------------------------------- */
    if (attackType === "ultimate") {
      const ultVariant = (levelNum + qIdx) % 4;
      if (clsKey === "python") {
        if (ultVariant === 0) {
          const targetTotal = baseVal * multVal;
          const cmd = `${varName} = ${targetTotal}`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Assign the calculated product \`${targetTotal}\` (${baseVal} * ${multVal}) to variable \`${varName}\`.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: Variable \`${varName}\` ko \`${targetTotal}\` (${baseVal} * ${multVal}) value assign karein.`,
            },
            code: `# Tier ${chapterNum} Calibration: set ${varName} equal to ${targetTotal}`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${varName}=${targetTotal}`, `${varName} = ${baseVal} * ${multVal}`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` stores the scaled Chapter ${chapterNum} power value \`${targetTotal}\` in \`${varName}\`.`,
              ur: `\`${cmd}\` variable \`${varName}\` mein \`${targetTotal}\` save karke dushman par waar karta hai.`,
            },
          });
        } else if (ultVariant === 1) {
          const cmd = `${varName} += ${stepVal}`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Increment \`${varName}\` by \`${stepVal}\` using the \`+=\` operator.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: \`+=\` operator istemal karke \`${varName}\` mein \`${stepVal}\` ka izafa karein.`,
            },
            code: `${varName} = ${baseVal}\n# Add ${stepVal} to ${varName} using +=:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${varName}+=${stepVal}`, `${varName} = ${varName} + ${stepVal}`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` updates \`${varName}\` from \`${baseVal}\` to \`${baseVal + stepVal}\`.`,
              ur: `\`${cmd}\` variable \`${varName}\` ko \`${baseVal}\` se barha kar \`${baseVal + stepVal}\` kar deta hai.`,
            },
          });
        } else if (ultVariant === 2) {
          const cmd = `if ${varName} >= ${threshold}:`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Type the Python \`if\` header checking if \`${varName} >= ${threshold}\` (include the colon).`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: Check karne ke liye ke \`${varName} >= ${threshold}\` hai, Python \`if\` header colon سمیت likhein.`,
            },
            code: `${varName} = ${threshold + 5}\n# Write the if condition header:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `if(${varName}>=${threshold}):`, `if (${varName} >= ${threshold}):`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` validates that \`${varName}\` meets the Level ${levelNum} threshold of \`${threshold}\`.`,
              ur: `\`${cmd}\` check karta hai ke \`${varName}\` kam az kam \`${threshold}\` hai.`,
            },
          });
        } else {
          const word = isBoss ? `ARISE_LV${levelNum}` : `GATE_${levelNum}`;
          const cmd = `print("${word}")`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE FINISHER: Type the Python statement to print \`"${word}"\`.`,
              ur: `${prefixTagUr}ULTIMATE FINISHER: Console par \`"${word}"\` print karne ka Python code likhein.`,
            },
            code: `# Execute Level ${levelNum} Python Finisher:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `print('${word}')`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` unleashes the Level ${levelNum} Shadow Necromancer finisher!`,
              ur: `\`${cmd}\` Level ${levelNum} ka Shadow Necromancer finisher mukammal karta hai!`,
            },
          });
        }
      } else if (clsKey === "javascript") {
        if (ultVariant === 0) {
          const targetTotal = baseVal * multVal;
          const cmd = `let ${varName} = ${targetTotal}`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Declare \`let ${varName} = ${targetTotal}\` in JavaScript.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: JavaScript mein \`let ${varName} = ${targetTotal}\` declare karein.`,
            },
            code: `// Initialize ${varName} to ${targetTotal}:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${cmd};`, `let ${varName}=${targetTotal}`, `let ${varName}=${targetTotal};`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` binds \`${targetTotal}\` to the block-scoped variable \`${varName}\`.`,
              ur: `\`${cmd}\` variable \`${varName}\` mein \`${targetTotal}\` store karta hai.`,
            },
          });
        } else if (ultVariant === 1) {
          const cmd = `${varName} += ${stepVal}`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Add \`${stepVal}\` to \`${varName}\` using \`+=\`.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: \`+=\` operator se \`${varName}\` mein \`${stepVal}\` jama karein.`,
            },
            code: `let ${varName} = ${baseVal};\n// Add ${stepVal} to ${varName}:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${cmd};`, `${varName}+=${stepVal}`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` boosts \`${varName}\` from \`${baseVal}\` to \`${baseVal + stepVal}\`.`,
              ur: `\`${cmd}\` variable \`${varName}\` ko \`${baseVal + stepVal}\` tak barha deta hai.`,
            },
          });
        } else if (ultVariant === 2) {
          const cmd = `${varName} === ${threshold}`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Type the strict equality check comparing \`${varName}\` to \`${threshold}\`.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: Strict equality \`===\` se check karein ke \`${varName}\` barabar hai \`${threshold}\` ke.`,
            },
            code: `let ${varName} = ${threshold};\n// Type strict equality expression:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${cmd};`, `${varName}===${threshold}`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` verifies both numeric value and type in JavaScript.`,
              ur: `\`${cmd}\` value aur data type dono ki barabari check karta hai.`,
            },
          });
        } else {
          const word = isBoss ? `ARISE_LV${levelNum}` : `GATE_${levelNum}`;
          const cmd = `console.log("${word}")`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE FINISHER: Log \`"${word}"\` using \`console.log()\`.`,
              ur: `${prefixTagUr}ULTIMATE FINISHER: \`console.log()\` se \`"${word}"\` print karein.`,
            },
            code: `// Execute Level ${levelNum} Cyber Assassin Finisher:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${cmd};`, `console.log('${word}')`, `console.log('${word}');`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` triggers the Level ${levelNum} Cyber Assassin finisher!`,
              ur: `\`${cmd}\` Level ${levelNum} ka Cyber Assassin finisher chalata hai!`,
            },
          });
        }
      } else {
        // C++ Ultimate variants
        if (ultVariant === 0) {
          const targetTotal = baseVal * multVal;
          const cmd = `int ${varName} = ${targetTotal};`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Declare \`int ${varName} = ${targetTotal};\` in C++.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: C++ mein \`int ${varName} = ${targetTotal};\` declare karein.`,
            },
            code: `// Declare integer ${varName} equal to ${targetTotal}:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `int ${varName} = ${targetTotal}`, `int ${varName}=${targetTotal};`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` allocates integer \`${varName}\` initialized to \`${targetTotal}\`.`,
              ur: `\`${cmd}\` memory mein \`${varName}\` bana kar \`${targetTotal}\` save karta hai.`,
            },
          });
        } else if (ultVariant === 1) {
          const cmd = `${varName} += ${stepVal};`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Add \`${stepVal}\` to \`${varName}\` using \`+=\` in C++.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: C++ mein \`+=\` se \`${varName}\` mein \`${stepVal}\` jama karein.`,
            },
            code: `int ${varName} = ${baseVal};\n// Add ${stepVal} to ${varName}:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${varName} += ${stepVal}`, `${varName}+=${stepVal};`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` increments \`${varName}\` to \`${baseVal + stepVal}\`.`,
              ur: `\`${cmd}\` variable \`${varName}\` ko barha kar \`${baseVal + stepVal}\` kar deta hai.`,
            },
          });
        } else if (ultVariant === 2) {
          const cmd = `${varName} >= ${threshold}`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE TERMINAL: Type the C++ comparison checking if \`${varName}\` is at least \`${threshold}\`.`,
              ur: `${prefixTagUr}ULTIMATE TERMINAL: Check karein ke \`${varName}\` bada ya barabar hai \`${threshold}\` ke (\`${cmd}\`).`,
            },
            code: `int ${varName} = ${threshold};\n// Type >= comparison:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `${cmd};`, `(${cmd})`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` evaluates whether \`${varName}\` meets the threshold \`${threshold}\`.`,
              ur: `\`${cmd}\` check karta hai ke \`${varName}\` kam az kam \`${threshold}\` hai.`,
            },
          });
        } else {
          const word = isBoss ? `ARISE_LV${levelNum}` : `GATE_${levelNum}`;
          const cmd = `cout << "${word}";`;
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "ultimate",
            bossTaunt,
            q: {
              en: `${prefixTag}ULTIMATE FINISHER: Output \`"${word}"\` using \`cout\` in C++.`,
              ur: `${prefixTagUr}ULTIMATE FINISHER: C++ mein \`cout\` se \`"${word}"\` print karein.`,
            },
            code: `// Execute Level ${levelNum} Berserker Monarch Finisher:`,
            placeholder: cmd,
            acceptedAnswers: [cmd, `cout << "${word}"`, `std::cout << "${word}";`],
            hint: { en: `Type: ${cmd}`, ur: `Yeh type karein: ${cmd}` },
            exp: {
              en: `\`${cmd}\` unleashes the Level ${levelNum} Berserker Greatsword finisher!`,
              ur: `\`${cmd}\` Level ${levelNum} ka Berserker Greatsword finisher mukammal karta hai!`,
            },
          });
        }
      }
    }

    /* ----------------------------------------------------------------------
       HEAVY ATTACK (BUG BREAKER) TEMPLATES (LEVELS 11–400)
       ---------------------------------------------------------------------- */
    if (attackType === "heavy") {
      const bugPattern = (levelNum + qIdx) % 4;

      if (clsKey === "python") {
        if (bugPattern === 0) {
          const built = buildRotatedOptions(
            `Replace single \`=\` with \`==\` (\`if ${varName} == ${threshold}:\`)`,
            [
              `Remove the colon \`:\` at the end of line 2`,
              `Put \`${threshold}\` inside square brackets`,
              `Change \`if\` to \`elif\``,
            ],
            `Single \`=\` ki jagah \`==\` lagayein (\`if ${varName} == ${threshold}:\`)`,
            [
              `Line 2 ke aakhir se colon \`:\` hata dein`,
              `\`${threshold}\` ko square brackets mein rakhein`,
              `\`if\` ko \`elif\` bana dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does this Python conditional raise a SyntaxError?`,
              ur: `${prefixTagUr}BUG BREAKER: Is Python conditional mein SyntaxError kyun aa raha hai?`,
            },
            code: `${varName} = ${threshold}\nif ${varName} = ${threshold}:\n    print("Gate ${levelNum} Clear")`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Inside a Python \`if\` condition, equality must be checked with \`==\` (\`if ${varName} == ${threshold}:\`), not \`=\`.`,
              ur: `Python \`if\` ki shart mein barabari check karne ke liye \`==\` lagta hai, single \`=\` nahi.`,
            },
          });
        } else if (bugPattern === 1) {
          const built = buildRotatedOptions(
            `Convert \`${varName}\` with \`int(${varName}) + ${stepVal}\` or remove quotes around \`"${baseVal}"\``,
            [
              `Replace \`+\` with \`-\``,
              `Change \`print\` to \`echo\``,
              `Add a semicolon after \`${stepVal}\``,
            ],
            `\`int(${varName}) + ${stepVal}\` istemal karein ya \`"${baseVal}"\` se quotes hata dein`,
            [
              `\`+\` ki jagah \`-\` lagayein`,
              `\`print\` ko \`echo\` bana dein`,
              `\`${stepVal}\` ke baad semicolon lagayein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does adding \`${stepVal}\` to \`${varName}\` raise a TypeError here?`,
              ur: `${prefixTagUr}BUG BREAKER: Yahan \`${varName}\` mein \`${stepVal}\` jama karne par TypeError kyun aata hai?`,
            },
            code: `${varName} = "${baseVal}"\nprint(${varName} + ${stepVal})`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `\`"${baseVal}"\` is a \`str\` while \`${stepVal}\` is an \`int\`. Cast with \`int(${varName})\` or store \`${baseVal}\` as a number.`,
              ur: `\`"${baseVal}"\` ek string hai aur \`${stepVal}\` integer hai. Hisab ke liye \`int(${varName})\` istemal karein.`,
            },
          });
        } else if (bugPattern === 2) {
          const built = buildRotatedOptions(
            `Assign the result back using \`${varName} += ${stepVal}\` or \`${varName} = ${varName} + ${stepVal}\``,
            [
              `Delete line 1`,
              `Wrap \`${varName}\` in quotes inside \`print()\``,
              `Use \`//\` instead of \`+\``,
            ],
            `Natija wapas save karne ke liye \`${varName} += ${stepVal}\` ya \`${varName} = ${varName} + ${stepVal}\` likhein`,
            [
              `Line 1 mita dein`,
              `\`print()\` mein \`${varName}\` ke gird quotes lagayein`,
              `\`+\` ki jagah \`//\` lagayein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does \`print(${varName})\` still output \`${baseVal}\` instead of \`${baseVal + stepVal}\`?`,
              ur: `${prefixTagUr}BUG BREAKER: \`print(${varName})\` abhi bhi \`${baseVal + stepVal}\` ke bajaye \`${baseVal}\` kyun dikha raha hai?`,
            },
            code: `${varName} = ${baseVal}\n${varName} + ${stepVal}\nprint(${varName})`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `\`${varName} + ${stepVal}\` computes \`${baseVal + stepVal}\` without saving it. Use \`${varName} += ${stepVal}\` to update the variable.`,
              ur: `\`${varName} += ${stepVal}\` likhne se hi nayi value wapas variable mein save hoti hai.`,
            },
          });
        } else {
          const built = buildRotatedOptions(
            `Indent \`print("Strike")\` with 4 spaces and add a colon \`:\` after \`${threshold}\``,
            [
              `Change \`>\` to \`<<\``,
              `Capitalize \`IF\``,
              `Remove \`${varName}\` from line 1`,
            ],
            `\`if\` line ke aakhir mein colon \`:\` lagayein aur \`print\` ko 4 spaces de kar indent karein`,
            [
              `\`>\` ko \`<<\` bana dein`,
              `\`IF\` ko capital likhein`,
              `Line 1 se \`${varName}\` hata dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: What two syntax mistakes break this Python \`if\` block?`,
              ur: `${prefixTagUr}BUG BREAKER: Is Python \`if\` block mein kaunsi do syntax ghaltiyan hain?`,
            },
            code: `${varName} = ${threshold + 10}\nif ${varName} > ${threshold}\nprint("Strike")`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Python requires a colon \`:\` at the end of the \`if\` header and 4-space indentation for the body.`,
              ur: `Python mein \`if\` ke aakhir mein colon \`:\` aur andar wali line mein indentation (spaces) zaroori hai.`,
            },
          });
        }
      } else if (clsKey === "javascript") {
        if (bugPattern === 0) {
          const built = buildRotatedOptions(
            `Change \`const ${varName}\` to \`let ${varName}\` so it can be reassigned with \`+=\``,
            [
              `Change \`+=\` to \`===\``,
              `Put \`${baseVal}\` in single quotes`,
              `Remove \`console.log\``,
            ],
            `\`const ${varName}\` ko \`let ${varName}\` mein badlein taake \`+=\` se value barh sake`,
            [
              `\`+=\` ko \`===\` bana dein`,
              `\`${baseVal}\` ko quotes mein likhein`,
              `\`console.log\` hata dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does this JavaScript code throw a TypeError on line 2?`,
              ur: `${prefixTagUr}BUG BREAKER: Is JavaScript code ki doosri line par TypeError kyun aata hai?`,
            },
            code: `const ${varName} = ${baseVal};\n${varName} += ${stepVal};\nconsole.log(${varName});`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Variables declared with \`const\` cannot be updated with \`+=\`. Use \`let ${varName} = ${baseVal};\`.`,
              ur: `\`const\` variable ko dobara update nahi kiya ja sakta; iske liye \`let\` istemal karein.`,
            },
          });
        } else if (bugPattern === 1) {
          const built = buildRotatedOptions(
            `Remove the quotes around \`"${baseVal}"\` (or use \`Number(${varName})\`) so \`+\` performs numeric addition`,
            [
              `Change \`+\` to \`===\``,
              `Add \`/* */\` around line 2`,
              `Rename \`${varName}\` to \`const\``,
            ],
            `\`"${baseVal}"\` se quotes hatayein (ya \`Number(${varName})\` lagayein) taake hisabi jama ho`,
            [
              `\`+\` ko \`===\` bana dein`,
              `Line 2 ko comment bana dein`,
              `\`${varName}\` ka naam \`const\` rakh dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does this log \`"${baseVal}${stepVal}"\` instead of \`${baseVal + stepVal}\`?`,
              ur: `${prefixTagUr}BUG BREAKER: Yeh code \`${baseVal + stepVal}\` ke bajaye \`"${baseVal}${stepVal}"\` kyun print kar raha hai?`,
            },
            code: `let ${varName} = "${baseVal}";\nconsole.log(${varName} + ${stepVal});`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Because \`${varName}\` is a string, \`+\` concatenates instead of adding numerically. Store \`${baseVal}\` as a number.`,
              ur: `Kyunke \`${varName}\` string hai, \`+\` dono ko text ki tarah jor deta hai. Hisab ke liye quotes hata dein.`,
            },
          });
        } else if (bugPattern === 2) {
          const built = buildRotatedOptions(
            `Use strict equality \`===\` (\`if (${varName} === ${threshold})\`) instead of single assignment \`=\``,
            [
              `Replace \`{ }\` with square brackets \`[ ]\``,
              `Change \`let\` to \`True\``,
              `Remove parentheses around the condition`,
            ],
            `Single \`=\` ki jagah strict equality \`===\` (\`if (${varName} === ${threshold})\`) lagayein`,
            [
              `\`{ }\` ki jagah \`[ ]\` lagayein`,
              `\`let\` ko \`True\` bana dein`,
              `Condition ke gird se brackets hata dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does this \`if\` block execute even when \`${varName}\` is \`0\`?`,
              ur: `${prefixTagUr}BUG BREAKER: \`${varName}\` ki value \`0\` hone ke bawajood yeh \`if\` block kyun chal jata hai?`,
            },
            code: `let ${varName} = 0;\nif (${varName} = ${threshold}) {\n  console.log("Triggered");\n}`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `\`${varName} = ${threshold}\` assigns \`${threshold}\` (which is truthy) to \`${varName}\`. Use \`===\` to compare values.`,
              ur: `Single \`=\` value assign kar deta hai. Barabari check karne ke liye \`===\` istemal karein.`,
            },
          });
        } else {
          const built = buildRotatedOptions(
            `Use lowercase \`true\` and \`false\` in JavaScript instead of capitalized \`True\``,
            [
              `Wrap \`True\` in curly braces`,
              `Use \`#\` for comments`,
              `Replace \`let\` with \`int\``,
            ],
            `JavaScript mein capital \`True\` ke bajaye chhote harfon mein \`true\` likhein`,
            [
              `\`True\` ko curly braces mein band karein`,
              `Comment ke liye \`#\` lagayein`,
              `\`let\` ki jagah \`int\` likhein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does \`let flag = True;\` throw a ReferenceError in JavaScript?`,
              ur: `${prefixTagUr}BUG BREAKER: JavaScript mein \`let flag = True;\` par ReferenceError kyun aata hai?`,
            },
            code: `let flag = True;\nconsole.log(flag);`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `JavaScript boolean literals are lowercase \`true\` and \`false\`.`,
              ur: `JavaScript mein Boolean keywords hamesha chhote harfon (\`true\` / \`false\`) mein hote hain.`,
            },
          });
        }
      } else {
        // C++ Heavy Bug Breaker variants
        if (bugPattern === 0) {
          const built = buildRotatedOptions(
            `Use \`double ${varName} = ${baseVal}.5;\` so the \`.5\` decimal fraction is not truncated by \`int\``,
            [
              `Use \`bool ${varName} = ${baseVal}.5;\``,
              `Change \`cout <<\` to \`cout >>\``,
              `Remove the semicolon at the end of line 1`,
            ],
            `\`int\` ki jagah \`double ${varName} = ${baseVal}.5;\` lagayein taake \`.5\` zaya na ho`,
            [
              `\`bool ${varName}\` istemal karein`,
              `\`cout <<\` ko \`cout >>\` bana dein`,
              `Line 1 se semicolon hata dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does this C++ code output \`${baseVal}\` instead of \`${baseVal}.5\`?`,
              ur: `${prefixTagUr}BUG BREAKER: Yeh C++ code \`${baseVal}.5\` ke bajaye \`${baseVal}\` kyun print kar raha hai?`,
            },
            code: `int ${varName} = ${baseVal}.5;\ncout << ${varName};`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `An \`int\` truncates decimals. Declare \`double ${varName} = ${baseVal}.5;\` to preserve the fractional part.`,
              ur: `\`int\` point ke baad wala hissa kaat deta hai. Point wali value ke liye \`double\` istemal karein.`,
            },
          });
        } else if (bugPattern === 1) {
          const built = buildRotatedOptions(
            `Replace single \`=\` with \`==\` (\`if (${varName} == ${threshold})\`)`,
            [
              `Add a semicolon right after \`if (${varName} = ${threshold});\``,
              `Remove parentheses around the condition`,
              `Change \`int\` to \`string\``,
            ],
            `Single \`=\` ki jagah \`==\` lagayein (\`if (${varName} == ${threshold})\`)`,
            [
              `\`if\` ke foran baad semicolon lagayein`,
              `Condition ki brackets hata dein`,
              `\`int\` ko \`string\` bana dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does \`if (${varName} = ${threshold})\` overwrite \`${varName}\` instead of comparing?`,
              ur: `${prefixTagUr}BUG BREAKER: \`if (${varName} = ${threshold})\` muqabla karne ke bajaye value kyun badal deta hai?`,
            },
            code: `int ${varName} = ${baseVal};\nif (${varName} = ${threshold}) {\n    cout << "Crit";\n}`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Single \`=\` performs assignment. Use \`==\` (\`if (${varName} == ${threshold})\`) to test equality in C++.`,
              ur: `C++ mein barabari check karne ke liye \`==\` lagta hai, single \`=\` nahi.`,
            },
          });
        } else if (bugPattern === 2) {
          const built = buildRotatedOptions(
            `Add the missing semicolon \`;\` at the end of line 1 (\`int ${varName} = ${baseVal};\`)`,
            [
              `Replace \`int\` with \`let\``,
              `Change \`<<\` to \`>>\``,
              `Wrap \`${varName}\` in single quotes`,
            ],
            `Line 1 ke aakhir mein semicolon \`;\` lagayein (\`int ${varName} = ${baseVal};\`)`,
            [
              `\`int\` ki jagah \`let\` likhein`,
              `\`<<\` ko \`>>\` bana dein`,
              `\`${varName}\` ko single quotes mein rakhein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does this C++ snippet fail at compile time?`,
              ur: `${prefixTagUr}BUG BREAKER: Yeh C++ code compile kyun nahi ho raha?`,
            },
            code: `int ${varName} = ${baseVal}\ncout << ${varName};`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Every C++ declaration statement must end with a semicolon \`;\`.`,
              ur: `C++ mein har statement ke aakhir mein semicolon \`;\` lagana zaroori hai.`,
            },
          });
        } else {
          const built = buildRotatedOptions(
            `Use double quotes \`"Rank_${levelNum}"\` and \`string\` type instead of \`int\``,
            [
              `Use \`bool\` type`,
              `Remove the \`=\` sign`,
              `Change \`${varName}\` to \`1_${varName}\``,
            ],
            `\`int\` ke bajaye \`string\` data type aur double quotes \`"Rank_${levelNum}"\` istemal karein`,
            [
              `\`bool\` type lagayein`,
              `\`=\` ka nishan hata dein`,
              `\`${varName}\` ka naam \`1_${varName}\` rakh dein`,
            ],
            correctSlot
          );
          return makeQuestion({
            id: `L${levelNum}_Q${qIdx + 1}`,
            attackType: "heavy",
            bossTaunt,
            q: {
              en: `${prefixTag}BUG BREAKER: Why does \`int ${varName} = 'Rank_${levelNum}';\` fail in C++?`,
              ur: `${prefixTagUr}BUG BREAKER: C++ mein \`int ${varName} = 'Rank_${levelNum}';\` kyun ghalat hai?`,
            },
            code: `int ${varName} = 'Rank_${levelNum}';`,
            options: built.options,
            correct: built.correct,
            exp: {
              en: `Text strings in C++ require the \`string\` data type and double quotes: \`string ${varName} = "Rank_${levelNum}";\`.`,
              ur: `C++ mein text ke liye \`string\` type aur double quotes \`" "\` lagانا zaroori hai.`,
            },
          });
        }
      }
    }

    /* ----------------------------------------------------------------------
       LIGHT ATTACK (QUICK MCQ) TEMPLATES (LEVELS 11–400)
       ---------------------------------------------------------------------- */
    const lightPattern = (levelNum + qIdx) % 4;
    const computedAddMult = (baseVal + stepVal) * multVal;
    const wrong1 = baseVal + stepVal * multVal;
    const wrong2 = baseVal * multVal;
    const wrong3 = baseVal + stepVal + multVal;

    if (clsKey === "python") {
      if (lightPattern === 0) {
        const built = buildRotatedOptions(
          String(computedAddMult),
          [String(wrong1), String(wrong2), String(wrong3)],
          String(computedAddMult),
          [String(wrong1), String(wrong2), String(wrong3)],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What will this Python arithmetic sequence print?`,
            ur: `${prefixTagUr}Yeh Python hisabi code kya print karega?`,
          },
          code: `${varName} = ${baseVal}\n${varName} += ${stepVal}\n${varName} *= ${multVal}\nprint(${varName})`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `\`${varName}\` becomes \`${baseVal} + ${stepVal} = ${baseVal + stepVal}\`, then multiplies by \`${multVal}\` to output \`${computedAddMult}\`.`,
            ur: `Pehle \`${baseVal} + ${stepVal} = ${baseVal + stepVal}\` hota hai, phir \`* ${multVal}\` se \`${computedAddMult}\` aata hai.`,
          },
        });
      } else if (lightPattern === 1) {
        const isTrue = baseVal + stepVal >= threshold;
        const ansStr = isTrue ? "Awakened" : "Charging";
        const wrongBranch = isTrue ? "Charging" : "Awakened";
        const built = buildRotatedOptions(
          ansStr,
          [wrongBranch, String(baseVal), "SyntaxError"],
          ansStr,
          [wrongBranch, String(baseVal), "SyntaxError"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}Which branch does this Python \`if / else\` statement print?`,
            ur: `${prefixTagUr}Yeh Python \`if / else\` code kya print karega?`,
          },
          code: `${varName} = ${baseVal + stepVal}\nif ${varName} >= ${threshold}:\n    print("Awakened")\nelse:\n    print("Charging")`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Since \`${baseVal + stepVal} >= ${threshold}\` is \`${isTrue ? "True" : "False"}\`, Python prints \`${ansStr}\`.`,
            ur: `Kyunke \`${baseVal + stepVal} >= ${threshold}\` sach hai, is liye \`${ansStr}\` print hoga.`,
          },
        });
      } else if (lightPattern === 2) {
        const rem = (baseVal + stepVal) % multVal;
        const built = buildRotatedOptions(
          String(rem),
          [String(rem + 1), String(multVal), String(baseVal + stepVal)],
          String(rem),
          [String(rem + 1), String(multVal), String(baseVal + stepVal)],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What remainder does the modulo operator \`%\` produce here?`,
            ur: `${prefixTagUr}Yahan modulo operator \`%\` kya baaqi (remainder) dega?`,
          },
          code: `${varName} = ${baseVal + stepVal} % ${multVal}\nprint(${varName})`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Dividing \`${baseVal + stepVal}\` by \`${multVal}\` leaves a remainder of \`${rem}\`.`,
            ur: `\`${baseVal + stepVal}\` ko \`${multVal}\` par taqseem karne se baaqi (remainder) \`${rem}\` bachta hai.`,
          },
        });
      } else {
        const built = buildRotatedOptions(
          "True",
          ["False", String(baseVal), "None"],
          "True",
          ["False", String(baseVal), "None"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What Boolean value does this Python comparison output?`,
            ur: `${prefixTagUr}Yeh Python muqabla (comparison) kya Boolean output dega?`,
          },
          code: `${varName} = ${threshold}\nprint(${varName} != ${baseVal})`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Since \`${threshold}\` is not equal to \`${baseVal}\`, \`${varName} != ${baseVal}\` evaluates to \`True\`.`,
            ur: `Kyunke \`${threshold}\` aur \`${baseVal}\` barabar nahi hain, \`!=\` ka jawab \`True\` aata hai.`,
          },
        });
      }
    } else if (clsKey === "javascript") {
      if (lightPattern === 0) {
        const built = buildRotatedOptions(
          String(computedAddMult),
          [String(wrong1), String(wrong2), String(wrong3)],
          String(computedAddMult),
          [String(wrong1), String(wrong2), String(wrong3)],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What value is logged by this JavaScript calculation?`,
            ur: `${prefixTagUr}Yeh JavaScript code console par kya value print karega?`,
          },
          code: `let ${varName} = ${baseVal};\n${varName} += ${stepVal};\n${varName} *= ${multVal};\nconsole.log(${varName});`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `\`${varName}\` updates to \`${baseVal + stepVal}\` and then multiplies by \`${multVal}\` to log \`${computedAddMult}\`.`,
            ur: `\`${varName}\` pehle \`${baseVal + stepVal}\` banta hai aur phir \`* ${multVal}\` ho kar \`${computedAddMult}\` print karta hai.`,
          },
        });
      } else if (lightPattern === 1) {
        const built = buildRotatedOptions(
          "Cyber Crit",
          ["Normal Hit", "undefined", "NaN"],
          "Cyber Crit",
          ["Normal Hit", "undefined", "NaN"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What will this JavaScript \`if / else\` block output?`,
            ur: `${prefixTagUr}Yeh JavaScript \`if / else\` block kya output dega?`,
          },
          code: `let ${varName} = ${threshold + 4};\nif (${varName} > ${threshold}) {\n  console.log("Cyber Crit");\n} else {\n  console.log("Normal Hit");\n}`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Because \`${threshold + 4} > ${threshold}\` is \`true\`, \`"Cyber Crit"\` is logged.`,
            ur: `Kyunke \`${threshold + 4} > ${threshold}\` sach (\`true\`) hai, \`"Cyber Crit"\` print hoga.`,
          },
        });
      } else if (lightPattern === 2) {
        const built = buildRotatedOptions(
          "number",
          ["string", "boolean", "object"],
          "number",
          ["string", "boolean", "object"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What does \`typeof ${varName}\` return in this snippet?`,
            ur: `${prefixTagUr}Is code mein \`typeof ${varName}\` kya return karega?`,
          },
          code: `let ${varName} = ${baseVal} * ${multVal};\nconsole.log(typeof ${varName});`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `The product \`${baseVal * multVal}\` is a numeric value, so \`typeof ${varName}\` returns \`"number"\`.`,
            ur: `Zarb ka natija \`${baseVal * multVal}\` ek number hai, is liye \`typeof\` \`"number"\` deta hai.`,
          },
        });
      } else {
        const built = buildRotatedOptions(
          "false",
          ["true", String(threshold), "TypeError"],
          "false",
          ["true", String(threshold), "TypeError"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What does strict equality \`===\` output here?`,
            ur: `${prefixTagUr}Yahan strict equality \`===\` kya output degi?`,
          },
          code: `let ${varName} = ${threshold};\nconsole.log(${varName} === "${threshold}");`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Number \`${threshold}\` and string \`"${threshold}"\` have different types, so \`===\` evaluates to \`false\`.`,
            ur: `Number \`${threshold}\` aur string \`"${threshold}"\` ki data type alag hai, is liye \`===\` \`false\` deta hai.`,
          },
        });
      }
    } else {
      // C++ Light Attack variants
      if (lightPattern === 0) {
        const built = buildRotatedOptions(
          String(computedAddMult),
          [String(wrong1), String(wrong2), String(wrong3)],
          String(computedAddMult),
          [String(wrong1), String(wrong2), String(wrong3)],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What does \`cout << ${varName};\` output after these C++ statements?`,
            ur: `${prefixTagUr}In C++ statements ke baad \`cout << ${varName};\` kya print karega?`,
          },
          code: `int ${varName} = ${baseVal};\n${varName} += ${stepVal};\n${varName} *= ${multVal};\ncout << ${varName};`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `\`${varName}\` becomes \`${baseVal + stepVal}\` and then \`${computedAddMult}\` after multiplying by \`${multVal}\`.`,
            ur: `\`${varName}\` pehle \`${baseVal + stepVal}\` aur phir \`* ${multVal}\` se \`${computedAddMult}\` ban jata hai.`,
          },
        });
      } else if (lightPattern === 1) {
        const built = buildRotatedOptions(
          "Monarch Slash",
          ["Guard Stance", "0", "Compile Error"],
          "Monarch Slash",
          ["Guard Stance", "0", "Compile Error"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What will this C++ conditional block print?`,
            ur: `${prefixTagUr}Yeh C++ conditional code kya print karega?`,
          },
          code: `int ${varName} = ${threshold + 10};\nif (${varName} >= ${threshold}) {\n    cout << "Monarch Slash";\n} else {\n    cout << "Guard Stance";\n}`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Since \`${threshold + 10} >= ${threshold}\` is \`true\`, the \`if\` branch outputs \`Monarch Slash\`.`,
            ur: `Kyunke \`${threshold + 10} >= ${threshold}\` sach hai, \`Monarch Slash\` print hoga.`,
          },
        });
      } else if (lightPattern === 2) {
        const quotient = Math.floor((baseVal + stepVal) / 2);
        const built = buildRotatedOptions(
          String(quotient),
          [`${quotient}.5`, String(quotient + 1), String(baseVal + stepVal)],
          String(quotient),
          [`${quotient}.5`, String(quotient + 1), String(baseVal + stepVal)],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What does this C++ integer division output?`,
            ur: `${prefixTagUr}C++ mein yeh integer division kya output degi?`,
          },
          code: `int ${varName} = ${baseVal + stepVal} / 2;\ncout << ${varName};`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Integer division in C++ truncates any remainder, so \`${baseVal + stepVal} / 2\` outputs \`${quotient}\`.`,
            ur: `C++ integer division mein point ke baad ka hissa kat jata hai, is liye jawab \`${quotient}\` aayega.`,
          },
        });
      } else {
        const built = buildRotatedOptions(
          "1",
          ["0", String(threshold), "false"],
          "1",
          ["0", String(threshold), "false"],
          correctSlot
        );
        return makeQuestion({
          id: `L${levelNum}_Q${qIdx + 1}`,
          attackType: "light",
          bossTaunt,
          q: {
            en: `${prefixTag}What does \`cout\` print for this true comparison in C++?`,
            ur: `${prefixTagUr}C++ mein is sachay (true) comparison par \`cout\` kya print karega?`,
          },
          code: `int ${varName} = ${threshold};\ncout << (${varName} == ${threshold});`,
          options: built.options,
          correct: built.correct,
          exp: {
            en: `Since \`${varName} == ${threshold}\` is \`true\`, C++ \`cout\` outputs \`1\`.`,
            ur: `Kyunke \`${varName} == ${threshold}\` sach (\`true\`) hai, C++ mein \`cout\` \`1\` print karta hai.`,
          },
        });
      }
    }
  }

  // Cache for generated levels 11–400 so repeated lookups are instantaneous
  const GENERATED_LEVEL_CACHE = {};

  function getLevelData(classId, levelNum) {
    const clsKey = CLASSES[classId] ? classId : "python";
    const parsed = Math.floor(Number(levelNum) || 1);
    const safeLevel = Math.max(1, Math.min(400, parsed));

    if (safeLevel <= 10) {
      return CLASSES[clsKey].levels[safeLevel - 1];
    }

    const cacheKey = `${clsKey}_${safeLevel}`;
    if (GENERATED_LEVEL_CACHE[cacheKey]) {
      return GENERATED_LEVEL_CACHE[cacheKey];
    }

    const qCount = getRequiredQuestionCountForLevel(safeLevel);
    const tierStep = ((safeLevel - 1) % 10) + 1;
    const chapterNum = Math.floor((safeLevel - 1) / 10) + 1;
    const isBoss = tierStep === 10;
    const gateRanks = [
      "E-Rank",
      "E-Rank",
      "D-Rank",
      "D-Rank",
      "C-Rank",
      "C-Rank",
      "B-Rank",
      "B-Rank",
      "A-Rank",
      "S-Rank BOSS",
    ];

    const questions = [];
    for (let i = 0; i < qCount; i++) {
      questions.push(generateParameterizedQuestion(clsKey, safeLevel, i, qCount));
    }

    const generatedLevel = makeLevel({
      level: safeLevel,
      gateRank: gateRanks[tierStep - 1],
      enemyName: isBoss
        ? `CH.${chapterNum} ${CLASSES[clsKey].boss.name.en}`
        : `CH.${chapterNum} ${PROGRESSION_ENEMIES[tierStep - 1]}`,
      topic: {
        en: `Chapter ${chapterNum} Gate ${safeLevel} — Tier ${chapterNum} Combat Mastery`,
        ur: `Chapter ${chapterNum} Gate ${safeLevel} — Tier ${chapterNum} Coding Maharat`,
      },
      isBoss: isBoss,
      timer: 15,
      questions: questions,
    });

    GENERATED_LEVEL_CACHE[cacheKey] = generatedLevel;
    return generatedLevel;
  }

  function getLevelQuestions(classId, levelNum) {
    const lvlData = getLevelData(classId, levelNum);
    return lvlData && Array.isArray(lvlData.questions) ? lvlData.questions : [];
  }

  function getRankByXP(xp) {
    const numXP = Number(xp) || 0;
    let current = RANKS[0];
    for (let i = 0; i < RANKS.length; i++) {
      if (numXP >= RANKS[i].xp) {
        current = RANKS[i];
      }
    }
    return current;
  }

  /* ========================================================================
     12. GLOBAL EXPORTS (window.GameData & window.PYQUEST_DATA)
     ======================================================================== */
  const GameData = {
    __initializedStep3: true,
    version: "3.0.0-AAA-OFFLINE",
    offlineMode: true,
    maxLevel: 400,
    ui: UI,
    ranks: RANKS,
    classes: CLASSES,
    HUNTER_RANKS: RANKS,
    CLASSES: CLASSES,
    getLevelQuestions: getLevelQuestions,
    getLevelData: getLevelData,
    getRankByXP: getRankByXP,
    normalizeCodeAnswer: normalizeCodeAnswer,
    validateUltimateAnswer: validateUltimateAnswer,
  };

  window.GameData = GameData;
  window.PYQUEST_DATA = GameData;

  /* ========================================================================
     13. SEAMLESS RUNTIME BRIDGE FOR EXISTING STEP 1 engine.js
     - Advances active question within multi-question levels when Next Strike
       or Retry/Start Gate is clicked.
     - Synchronizes bilingual MCQ options and Rank badges on language toggle.
     ======================================================================== */
  function bindEngineCompatibilityBridge() {
    if (typeof document === "undefined") return;

    const getSelectedClassId = () => {
      const selectedCard = document.querySelector(".hunter-class-card.selected");
      if (selectedCard && selectedCard.dataset && selectedCard.dataset.class) {
        return selectedCard.dataset.class;
      }
      const hudName = (document.getElementById("hud-class-name")?.textContent || "").toLowerCase();
      if (hudName.includes("javascript") || hudName.includes("cyber")) return "javascript";
      if (hudName.includes("c++") || hudName.includes("berserker")) return "cpp";
      return "python";
    };

    const getCurrentGateLevelNum = () => {
      const ind = document.getElementById("level-indicator-text")?.textContent || "";
      const match = ind.match(/(\d+)/);
      return match ? Math.max(1, Math.min(10, parseInt(match[1], 10))) : 1;
    };

    const syncOptionButtonsLanguage = () => {
      const lang = getActiveLang();
      const clsId = getSelectedClassId();
      const lvlNum = getCurrentGateLevelNum();
      const lvl = CLASSES[clsId]?.levels[lvlNum - 1];
      if (!lvl || !lvl.options) return;

      const langOpts = lang === "ur" ? lvl.options.ur : lvl.options.en;
      if (Array.isArray(langOpts)) {
        for (let i = 0; i < 4; i++) {
          lvl.options[i] = langOpts[i];
        }
        const btns = document.querySelectorAll(".option-btn .option-text");
        btns.forEach((span, idx) => {
          if (langOpts[idx] !== undefined) {
            span.textContent = langOpts[idx];
          }
        });
      }

      // Sync Class name and Rank badge text in active language
      const hudClassEl = document.getElementById("hud-class-name");
      if (hudClassEl && CLASSES[clsId]?.name) {
        hudClassEl.textContent =
          lang === "ur" ? CLASSES[clsId].name.ur : CLASSES[clsId].name.en;
      }
      const xpText = document.getElementById("xp-value")?.textContent || "50";
      const rankObj = getRankByXP(parseInt(xpText, 10) || 0);
      const rankBadgeEl = document.getElementById("rank-badge-text");
      if (rankBadgeEl && rankObj) {
        rankBadgeEl.textContent = lang === "ur" ? rankObj.ur : rankObj.en;
      }
    };

    setTimeout(syncOptionButtonsLanguage, 0);

    // Advance question pointer on Next Strike click (capture phase before engine.js)
    const nextBtn = document.getElementById("next-strike-btn");
    if (nextBtn && !nextBtn.dataset.step3Bound) {
      nextBtn.dataset.step3Bound = "true";
      nextBtn.addEventListener(
        "click",
        () => {
          const clsId = getSelectedClassId();
          const lvlNum = getCurrentGateLevelNum();
          const lvl = CLASSES[clsId]?.levels[lvlNum - 1];
          if (lvl && Array.isArray(lvl.questions) && lvl.questions.length > 1) {
            const nextIdx = ((lvl.currentQuestionIndex || 0) + 1) % lvl.questions.length;
            syncLevelActiveQuestion(lvl, nextIdx);
            setTimeout(syncOptionButtonsLanguage, 0);
          }
        },
        true
      );
    }

    // Sync options & HUD when language toggle is clicked
    const langBtn = document.getElementById("lang-toggle");
    if (langBtn && !langBtn.dataset.step3Bound) {
      langBtn.dataset.step3Bound = "true";
      langBtn.addEventListener("click", () => {
        setTimeout(syncOptionButtonsLanguage, 0);
      });
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindEngineCompatibilityBridge);
    } else {
      bindEngineCompatibilityBridge();
    }
  }
})();

