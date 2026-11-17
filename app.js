const palette = [
  "#ef7f72",
  "#f1c96f",
  "#67b7a5",
  "#6f9fd8",
  "#9b8fd3",
  "#e79ab0",
  "#8cc88a",
  "#e3a35f",
  "#78b8c4",
  "#c99bd6",
];

const savedClassesKey = "student-picker-classes";
const currentRosterKey = "student-picker-current-roster";
const seededRosterMigrationKey = "student-picker-seeded-roster-migration";
const savedClassLifetimeMs = 365 * 24 * 60 * 60 * 1000;
const seededRosters = [
  ["Avery", "Maya", "Jordan", "Noah", "Sofia", "Leo"],
  ["Avery", "Maya", "Jordan"],
];

const state = {
  names: loadCurrentRoster(),
  rotation: 0,
  spinning: false,
  removeWinner: false,
  theme: localStorage.getItem("student-picker-theme") || "light",
  savedClasses: loadSavedClasses(),
  selectedClass: "",
  classesOpen: false,
  presenterMode: false,
};

const entryForm = document.querySelector("#entryForm");
const nameInput = document.querySelector("#nameInput");
const openClassesButton = document.querySelector("#openClassesButton");
const closeClassesButton = document.querySelector("#closeClassesButton");
const presenterButton = document.querySelector("#presenterButton");
const classDrawer = document.querySelector("#classDrawer");
const classSaveForm = document.querySelector("#classSaveForm");
const classNameInput = document.querySelector("#classNameInput");
const classSelect = document.querySelector("#classSelect");
const saveClassButton = document.querySelector("#saveClassButton");
const loadClassButton = document.querySelector("#loadClassButton");
const deleteClassButton = document.querySelector("#deleteClassButton");
const classStatus = document.querySelector("#classStatus");
const shuffleButton = document.querySelector("#shuffleButton");
const sortButton = document.querySelector("#sortButton");
const clearButton = document.querySelector("#clearButton");
const spinButton = document.querySelector("#spinButton");
const themeToggle = document.querySelector("#themeToggle");
const themeLabel = document.querySelector("#themeLabel");
const removeWinnerToggle = document.querySelector("#removeWinnerToggle");
const nameList = document.querySelector("#nameList");
const nameCount = document.querySelector("#nameCount");
const emptyState = document.querySelector("#emptyState");
const winnerName = document.querySelector("#winnerName");
const winnerStrip = document.querySelector("#winnerStrip");
const winnerToast = document.querySelector("#winnerToast");
const seedChip = document.querySelector("#seedChip");
const wheelWrap = document.querySelector(".wheel-wrap");
const wheelCanvas = document.querySelector("#wheelCanvas");
const wheelContext = wheelCanvas.getContext("2d");
const confettiCanvas = document.querySelector("#confettiCanvas");
const confettiContext = confettiCanvas.getContext("2d");

function loadSavedClasses() {
  try {
    const saved = JSON.parse(localStorage.getItem(savedClassesKey) || "{}");
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return {};
    const now = Date.now();
    const normalizedClasses = {};
    let shouldResave = false;

    Object.entries(saved).forEach(([name, value]) => {
      if (typeof name !== "string") return;

      const savedAt =
        value && typeof value === "object" && !Array.isArray(value)
          ? Number(value.savedAt)
          : now;
      const expiresAt =
        value && typeof value === "object" && !Array.isArray(value)
          ? Number(value.expiresAt)
          : now + savedClassLifetimeMs;
      const roster = Array.isArray(value) ? value : value?.roster;

      if (
        !Array.isArray(roster) ||
        !roster.every((student) => typeof student === "string")
      ) {
        shouldResave = true;
        return;
      }

      if (!Number.isFinite(expiresAt) || expiresAt <= now) {
        shouldResave = true;
        return;
      }

      normalizedClasses[name] = {
        roster,
        savedAt: Number.isFinite(savedAt) ? savedAt : now,
        expiresAt,
      };
      if (Array.isArray(value)) shouldResave = true;
    });

    if (shouldResave) {
      localStorage.setItem(savedClassesKey, JSON.stringify(normalizedClasses));
    }

    return normalizedClasses;
  } catch {
    return {};
  }
}

function createSavedClass(roster) {
  const savedAt = Date.now();
  return {
    roster: [...roster],
    savedAt,
    expiresAt: savedAt + savedClassLifetimeMs,
  };
}

function loadCurrentRoster() {
  try {
    const seededRosterMigrationDone =
      localStorage.getItem(seededRosterMigrationKey) === "done";
    const savedRoster = JSON.parse(localStorage.getItem(currentRosterKey) || "null");
    if (!savedRoster || typeof savedRoster !== "object") {
      localStorage.setItem(seededRosterMigrationKey, "done");
      return [];
    }
    if (!Number.isFinite(savedRoster.expiresAt) || savedRoster.expiresAt <= Date.now()) {
      localStorage.removeItem(currentRosterKey);
      localStorage.setItem(seededRosterMigrationKey, "done");
      return [];
    }
    if (
      !Array.isArray(savedRoster.names) ||
      !savedRoster.names.every((name) => typeof name === "string")
    ) {
      localStorage.removeItem(currentRosterKey);
      localStorage.setItem(seededRosterMigrationKey, "done");
      return [];
    }
    if (!seededRosterMigrationDone && isSeededRoster(savedRoster.names)) {
      localStorage.removeItem(currentRosterKey);
      localStorage.setItem(seededRosterMigrationKey, "done");
      return [];
    }
    localStorage.setItem(seededRosterMigrationKey, "done");
    return savedRoster.names;
  } catch {
    return [];
  }
}

function isSeededRoster(names) {
  return seededRosters.some(
    (seededRoster) =>
      seededRoster.length === names.length &&
      seededRoster.every((name, index) => name === names[index]),
  );
}

function saveCurrentRoster() {
  const savedAt = Date.now();
  localStorage.setItem(
    currentRosterKey,
    JSON.stringify({
      names: state.names,
      savedAt,
      expiresAt: savedAt + savedClassLifetimeMs,
    }),
  );
}

function saveSavedClasses() {
  localStorage.setItem(savedClassesKey, JSON.stringify(state.savedClasses));
}

function randomUnit() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] / 2 ** 32;
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function splitNames(value) {
  return value
    .split(/[\n,]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function addNames(incomingNames) {
  const seen = new Set(state.names.map((name) => name.toLowerCase()));
  incomingNames.forEach((name) => {
    const compactName = name.replace(/\s+/g, " ");
    const key = compactName.toLowerCase();
    if (!seen.has(key)) {
      state.names.push(compactName);
      seen.add(key);
    }
  });
  saveCurrentRoster();
  render();
}

function shuffleNames() {
  for (let index = state.names.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomUnit() * (index + 1));
    [state.names[index], state.names[swapIndex]] = [
      state.names[swapIndex],
      state.names[index],
    ];
  }
  seedChip.textContent = "Shuffled";
  saveCurrentRoster();
  render();
}

function removeName(nameToRemove) {
  state.names = state.names.filter((name) => name !== nameToRemove);
  saveCurrentRoster();
  render();
}

function resetPickState(message = "Ready") {
  winnerName.textContent = "No winner yet";
  seedChip.textContent = message;
}

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  themeLabel.textContent = state.theme === "dark" ? "Dark" : "Light";
  themeToggle.setAttribute(
    "aria-label",
    state.theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
  );
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("student-picker-theme", state.theme);
  applyTheme();
}

function setClassesOpen(isOpen) {
  state.classesOpen = isOpen;
  classDrawer.classList.toggle("open", isOpen);
  classDrawer.setAttribute("aria-hidden", String(!isOpen));
  openClassesButton.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) classNameInput.focus();
}

function setPresenterMode(isPresenter) {
  state.presenterMode = isPresenter;
  document.body.classList.toggle("presenter-mode", isPresenter);
  presenterButton.textContent = isPresenter ? "Exit" : "Expand";
  presenterButton.setAttribute(
    "aria-label",
    isPresenter ? "Exit presenter mode" : "Expand wheel presenter mode",
  );
  window.requestAnimationFrame(drawWheel);
}

function drawWheel() {
  const { width, height } = wheelCanvas;
  const center = width / 2;
  const radius = width / 2 - 18;
  const names = state.names.length ? state.names : ["Add names"];
  const segmentAngle = (Math.PI * 2) / names.length;

  wheelContext.clearRect(0, 0, width, height);
  wheelContext.save();
  wheelContext.translate(center, center);

  names.forEach((name, index) => {
    const startAngle = index * segmentAngle - Math.PI / 2;
    const endAngle = startAngle + segmentAngle;
    wheelContext.beginPath();
    wheelContext.moveTo(0, 0);
    wheelContext.arc(0, 0, radius, startAngle, endAngle);
    wheelContext.closePath();
    wheelContext.fillStyle = palette[index % palette.length];
    wheelContext.fill();

    wheelContext.strokeStyle = "rgba(255, 255, 255, 0.72)";
    wheelContext.lineWidth = 8;
    wheelContext.stroke();

    wheelContext.save();
    wheelContext.rotate(startAngle + segmentAngle / 2);
    wheelContext.textAlign = "right";
    wheelContext.textBaseline = "middle";
    wheelContext.fillStyle = "#ffffff";
    wheelContext.font = "900 30px Nunito Sans, DM Sans, system-ui, sans-serif";
    wheelContext.shadowColor = "rgba(31, 35, 51, 0.34)";
    wheelContext.shadowBlur = 5;
    wheelContext.fillText(trimForWheel(name), radius - 42, 0);
    wheelContext.restore();
  });

  wheelContext.beginPath();
  wheelContext.arc(0, 0, radius, 0, Math.PI * 2);
  wheelContext.strokeStyle = "#ffffff";
  wheelContext.lineWidth = 14;
  wheelContext.stroke();
  wheelContext.restore();
}

function trimForWheel(name) {
  return name.length > 14 ? `${name.slice(0, 13)}...` : name;
}

function renderNames() {
  nameList.innerHTML = "";
  state.names.forEach((name) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    const removeButton = document.createElement("button");

    label.textContent = name;
    removeButton.type = "button";
    removeButton.className = "remove-name";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove ${name}`);
    removeButton.addEventListener("click", () => removeName(name));

    item.append(label, removeButton);
    nameList.append(item);
  });
}

function renderControls() {
  const hasNames = state.names.length > 0;
  const canSpin = state.names.length >= 2 && !state.spinning;
  const hasSavedClasses = Object.keys(state.savedClasses).length > 0;
  nameCount.textContent = state.names.length;
  emptyState.hidden = hasNames;
  shuffleButton.disabled = state.names.length < 2 || state.spinning;
  sortButton.disabled = state.names.length < 2 || state.spinning;
  clearButton.disabled = !hasNames || state.spinning;
  spinButton.disabled = !canSpin;
  saveClassButton.disabled = !hasNames || state.spinning;
  classSelect.disabled = !hasSavedClasses || state.spinning;
  loadClassButton.disabled = !hasSavedClasses || !state.selectedClass || state.spinning;
  deleteClassButton.disabled = !hasSavedClasses || !state.selectedClass || state.spinning;
}

function renderSavedClasses() {
  const classNames = Object.keys(state.savedClasses).sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: "base" }),
  );
  const previousSelection = state.selectedClass;

  classSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = classNames.length ? "Choose a saved class" : "No saved classes yet";
  classSelect.append(placeholder);

  classNames.forEach((className) => {
    const option = document.createElement("option");
    option.value = className;
    option.textContent = className;
    classSelect.append(option);
  });

  state.selectedClass = classNames.includes(previousSelection) ? previousSelection : "";
  classSelect.value = state.selectedClass;
}

function render() {
  renderNames();
  renderSavedClasses();
  renderControls();
  drawWheel();
}

function showWinnerToast(name) {
  winnerToast.textContent = `${name} has been picked!`;
  winnerToast.classList.remove("show");
  void winnerToast.offsetWidth;
  winnerToast.classList.add("show");
}

function getWinnerIndexFromRotation(rotation) {
  const segmentDegrees = 360 / state.names.length;
  const pointerAngle = normalizeDegrees(-rotation);
  return Math.floor(pointerAngle / segmentDegrees) % state.names.length;
}

function spinWheel() {
  if (state.spinning || state.names.length < 2) return;

  state.spinning = true;
  renderControls();

  const targetIndex = Math.floor(randomUnit() * state.names.length);
  const segmentDegrees = 360 / state.names.length;
  const segmentCenter = targetIndex * segmentDegrees + segmentDegrees / 2;
  const safeLandingOffset = (randomUnit() - 0.5) * segmentDegrees * 0.5;
  const landingAngle = segmentCenter + safeLandingOffset;
  const fullSpins = 6 + Math.floor(randomUnit() * 4);
  const currentRotation = normalizeDegrees(state.rotation);
  const targetAtPointer = normalizeDegrees(-landingAngle);
  const extraRotation =
    fullSpins * 360 + normalizeDegrees(targetAtPointer - currentRotation);

  state.rotation += extraRotation;
  seedChip.textContent = "Spinning";
  wheelWrap.style.transform = `rotate(${state.rotation}deg)`;

  window.setTimeout(() => {
    const winnerIndex = getWinnerIndexFromRotation(state.rotation);
    const pickedName = state.names[winnerIndex];
    winnerName.textContent = pickedName;
    seedChip.textContent = `Picked ${pickedName}`;
    showWinnerToast(pickedName);
    winnerStrip.classList.remove("winner-pop");
    void winnerStrip.offsetWidth;
    winnerStrip.classList.add("winner-pop");
    burstConfetti();
    if (state.removeWinner) {
      state.names.splice(winnerIndex, 1);
      saveCurrentRoster();
      seedChip.textContent = `${pickedName} removed`;
    }
    state.spinning = false;
    render();
  }, 5600);
}

function resizeConfettiCanvas() {
  confettiCanvas.width = window.innerWidth * window.devicePixelRatio;
  confettiCanvas.height = window.innerHeight * window.devicePixelRatio;
  confettiContext.setTransform(
    window.devicePixelRatio,
    0,
    0,
    window.devicePixelRatio,
    0,
    0,
  );
}

function burstConfetti() {
  const pieces = Array.from({ length: 130 }, () => ({
    x: window.innerWidth / 2 + (randomUnit() - 0.5) * 160,
    y: window.innerHeight * 0.36,
    size: 6 + randomUnit() * 9,
    color: palette[Math.floor(randomUnit() * palette.length)],
    velocityX: (randomUnit() - 0.5) * 12,
    velocityY: -8 - randomUnit() * 8,
    rotation: randomUnit() * Math.PI,
    spin: (randomUnit() - 0.5) * 0.28,
    life: 90 + randomUnit() * 40,
  }));

  function tick() {
    confettiContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

    pieces.forEach((piece) => {
      piece.x += piece.velocityX;
      piece.y += piece.velocityY;
      piece.velocityY += 0.28;
      piece.rotation += piece.spin;
      piece.life -= 1;

      confettiContext.save();
      confettiContext.translate(piece.x, piece.y);
      confettiContext.rotate(piece.rotation);
      confettiContext.fillStyle = piece.color;
      confettiContext.fillRect(
        -piece.size / 2,
        -piece.size / 2,
        piece.size,
        piece.size * 0.62,
      );
      confettiContext.restore();
    });

    if (pieces.some((piece) => piece.life > 0 && piece.y < window.innerHeight + 80)) {
      requestAnimationFrame(tick);
    } else {
      confettiContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  tick();
}

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const names = splitNames(nameInput.value);
  if (names.length) {
    addNames(names);
    nameInput.value = "";
    nameInput.focus();
  }
});

shuffleButton.addEventListener("click", shuffleNames);

sortButton.addEventListener("click", () => {
  state.names.sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: "base" }),
  );
  seedChip.textContent = "Sorted";
  saveCurrentRoster();
  render();
});

clearButton.addEventListener("click", () => {
  state.names = [];
  resetPickState();
  saveCurrentRoster();
  render();
});

classSaveForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const className = classNameInput.value.trim().replace(/\s+/g, " ");
  if (!className || !state.names.length) return;

  state.savedClasses[className] = createSavedClass(state.names);
  state.selectedClass = className;
  classNameInput.value = "";
  classStatus.textContent = `${className} saved for one year on this computer.`;
  saveSavedClasses();
  render();
});

classSelect.addEventListener("change", () => {
  state.selectedClass = classSelect.value;
  renderControls();
});

loadClassButton.addEventListener("click", () => {
  const savedClass = state.savedClasses[state.selectedClass];
  if (!savedClass) return;

  state.names = [...savedClass.roster];
  resetPickState(`${state.selectedClass} loaded`);
  classStatus.textContent = `${state.selectedClass} loaded.`;
  saveCurrentRoster();
  render();
});

deleteClassButton.addEventListener("click", () => {
  if (!state.selectedClass) return;
  const deletedClass = state.selectedClass;
  delete state.savedClasses[deletedClass];
  state.selectedClass = "";
  classStatus.textContent = `${deletedClass} deleted.`;
  saveSavedClasses();
  render();
});

openClassesButton.addEventListener("click", () => {
  setClassesOpen(!state.classesOpen);
});

closeClassesButton.addEventListener("click", () => {
  setClassesOpen(false);
});

presenterButton.addEventListener("click", () => {
  setPresenterMode(!state.presenterMode);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (state.classesOpen) setClassesOpen(false);
  if (state.presenterMode) setPresenterMode(false);
});

spinButton.addEventListener("click", spinWheel);
themeToggle.addEventListener("click", toggleTheme);
removeWinnerToggle.addEventListener("change", () => {
  state.removeWinner = removeWinnerToggle.checked;
});
window.addEventListener("resize", resizeConfettiCanvas);

applyTheme();
resizeConfettiCanvas();
render();
