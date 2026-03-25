const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
const priorityOrder = [6, 0, 1, 5, 2, 4, 3];

const state = {
  customHolidays: [],
  customWorkdays: [],
  latestResult: null,
};

const elements = {
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  workersInput: document.querySelector("#workersInput"),
  errorText: document.querySelector("#errorText"),
  wednesdayList: document.querySelector("#wednesdayList"),
  thursdayList: document.querySelector("#thursdayList"),
  holidayCountBadge: document.querySelector("#holidayCountBadge"),
  holidayDateInput: document.querySelector("#holidayDateInput"),
  holidayFreeInput: document.querySelector("#holidayFreeInput"),
  addHolidayBtn: document.querySelector("#addHolidayBtn"),
  customHolidayList: document.querySelector("#customHolidayList"),
  workdayDateInput: document.querySelector("#workdayDateInput"),
  workdayCountInput: document.querySelector("#workdayCountInput"),
  addWorkdayBtn: document.querySelector("#addWorkdayBtn"),
  customWorkdayList: document.querySelector("#customWorkdayList"),
  generateBtn: document.querySelector("#generateBtn"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  summaryGrid: document.querySelector("#summaryGrid"),
  calendarGrid: document.querySelector("#calendarGrid"),
  scheduleList: document.querySelector("#scheduleList"),
  workerStats: document.querySelector("#workerStats"),
  summaryCardTemplate: document.querySelector("#summaryCardTemplate"),
};

function dateFromInput(value) {
  return new Date(`${value}T12:00:00`);
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return `${toDateKey(date)}(${dayNames[date.getDay()]})`;
}

function formatMonthTitle(year, monthIndex) {
  return `${year}.${String(monthIndex + 1).padStart(2, "0")}`;
}

function cloneDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function eachDay(start, end) {
  const days = [];
  for (let day = cloneDate(start); day <= end; day.setDate(day.getDate() + 1)) {
    days.push(cloneDate(day));
  }
  return days;
}

function getPriorityWorkDays(days) {
  const byOrder = [];
  for (const dayValue of priorityOrder) {
    byOrder.push(...days.filter((date) => date.getDay() === dayValue));
  }
  return byOrder;
}

function getWednesdays(start, end) {
  const result = [];
  const current = cloneDate(start);
  while (current.getDay() !== 3) {
    current.setDate(current.getDate() + 1);
  }
  while (current <= end) {
    result.push(cloneDate(current));
    current.setDate(current.getDate() + 7);
  }
  return result;
}

function getNthThursday(start, end, nth) {
  const result = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  while (current <= end) {
    let firstThursday = cloneDate(current);
    while (firstThursday.getDay() !== 4) {
      firstThursday.setDate(firstThursday.getDate() + 1);
    }
    const target = cloneDate(firstThursday);
    target.setDate(target.getDate() + (nth - 1) * 7);
    if (target >= start && target <= end) {
      result.push(target);
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12);
  }
  return result;
}

function getSecondThursdays(start, end) {
  return getNthThursday(start, end, 2);
}

function getFourthThursdays(start, end) {
  return getNthThursday(start, end, 4);
}

function normalizeWorkers(raw) {
  return raw
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function setError(message) {
  elements.errorText.textContent = message || "";
}

function upsertHoliday(dateKey, isFree) {
  state.customHolidays = state.customHolidays.filter((item) => item.date !== dateKey);
  state.customHolidays.push({ date: dateKey, isFree: Boolean(isFree) });
  state.customHolidays.sort((a, b) => a.date.localeCompare(b.date));
  state.customWorkdays = state.customWorkdays.filter((item) => item.date !== dateKey);
}

function upsertWorkday(dateKey, workerCount) {
  state.customWorkdays = state.customWorkdays.filter((item) => item.date !== dateKey);
  state.customWorkdays.push({ date: dateKey, workerCount });
  state.customWorkdays.sort((a, b) => a.date.localeCompare(b.date));
  state.customHolidays = state.customHolidays.filter((item) => item.date !== dateKey);
}

function renderCustomHolidayList() {
  const target = elements.customHolidayList;
  target.innerHTML = "";
  if (state.customHolidays.length === 0) {
    target.innerHTML = '<div class="empty-state">추가된 커스텀 휴무일이 없습니다.</div>';
    return;
  }

  for (const item of state.customHolidays) {
    const date = dateFromInput(item.date);
    const row = document.createElement("div");
    row.className = "entry-item";
    row.innerHTML = `
      <div class="entry-meta">
        <strong>${formatDate(date)}</strong>
        <span>${item.isFree ? "무료휴일로 계산" : "일반 휴무일로 계산"}</span>
      </div>
      <button class="danger-button" type="button">삭제</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      state.customHolidays = state.customHolidays.filter((holiday) => holiday.date !== item.date);
      renderEntryLists();
      generateSchedule();
    });
    target.appendChild(row);
  }
}

function renderCustomWorkdayList() {
  const target = elements.customWorkdayList;
  target.innerHTML = "";
  if (state.customWorkdays.length === 0) {
    target.innerHTML = '<div class="empty-state">추가된 커스텀 근무일이 없습니다.</div>';
    return;
  }

  for (const item of state.customWorkdays) {
    const date = dateFromInput(item.date);
    const row = document.createElement("div");
    row.className = "entry-item";
    row.innerHTML = `
      <div class="entry-meta">
        <strong>${formatDate(date)}</strong>
        <span>${item.workerCount}명 배치</span>
      </div>
      <button class="danger-button" type="button">삭제</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      state.customWorkdays = state.customWorkdays.filter((workday) => workday.date !== item.date);
      renderEntryLists();
      generateSchedule();
    });
    target.appendChild(row);
  }
}

function renderDatePills(target, dates) {
  target.innerHTML = "";
  if (dates.length === 0) {
    target.innerHTML = '<div class="empty-state">해당 기간의 자동 휴무일이 없습니다.</div>';
    return;
  }
  for (const date of dates) {
    const pill = document.createElement("span");
    pill.className = "date-pill";
    pill.textContent = formatDate(date);
    target.appendChild(pill);
  }
}

function getInputRange() {
  const startValue = elements.startDate.value;
  const endValue = elements.endDate.value;
  if (!startValue || !endValue) {
    return null;
  }
  const start = dateFromInput(startValue);
  const end = dateFromInput(endValue);
  return start <= end ? { start, end } : { start: end, end: start };
}

function updateAutoHolidayPreview() {
  const range = getInputRange();
  if (!range) {
    elements.holidayCountBadge.textContent = "0일";
    elements.wednesdayList.innerHTML = '<div class="empty-state">기간을 먼저 선택하세요.</div>';
    elements.thursdayList.innerHTML = '<div class="empty-state">기간을 먼저 선택하세요.</div>';
    return;
  }

  const customHolidayKeys = new Set(state.customHolidays.map((item) => item.date));
  const customWorkdayKeys = new Set(state.customWorkdays.map((item) => item.date));
  const wednesdays = getWednesdays(range.start, range.end).filter((date) => {
    const key = toDateKey(date);
    return !customHolidayKeys.has(key) && !customWorkdayKeys.has(key);
  });
  const thursdays = [...getSecondThursdays(range.start, range.end), ...getFourthThursdays(range.start, range.end)]
    .sort((a, b) => a - b)
    .filter((date) => {
      const key = toDateKey(date);
      return !customHolidayKeys.has(key) && !customWorkdayKeys.has(key);
    });

  const allHolidayKeys = new Set([
    ...wednesdays.map(toDateKey),
    ...thursdays.map(toDateKey),
    ...state.customHolidays.map((item) => item.date),
  ]);

  elements.holidayCountBadge.textContent = `${allHolidayKeys.size}일`;
  renderDatePills(elements.wednesdayList, wednesdays);
  renderDatePills(elements.thursdayList, thursdays);
}

function renderEntryLists() {
  renderCustomHolidayList();
  renderCustomWorkdayList();
  updateAutoHolidayPreview();
}

function assignWorkers(scheduleMap, dayKey, count, workerQueue, workerCount) {
  const list = scheduleMap.get(dayKey) ?? [];
  for (let index = 0; index < count; index += 1) {
    const worker = workerQueue.shift();
    workerCount.set(worker, (workerCount.get(worker) ?? 0) + 1);
    list.push({ name: worker, count: workerCount.get(worker) });
    workerQueue.push(worker);
  }
  scheduleMap.set(dayKey, list);
}

function assignExtraWorkersByPriority(scheduleMap, workDays, holidayKeys, customWorkdayKeys, workerCount, remainWork, workers) {
  let currentMaxWorkers = 5;
  const maxAllowedWorkers = workers.length;
  while (remainWork > 0) {
    let assignedThisRound = false;
    for (const day of workDays) {
      const dayKey = toDateKey(day);
      const entries = scheduleMap.get(dayKey) ?? [];
      if (holidayKeys.has(dayKey) || customWorkdayKeys.has(dayKey) || entries.length >= currentMaxWorkers) {
        continue;
      }

      const leastBusyWorker = workers
        .filter((worker) => !entries.some((entry) => entry.name === worker))
        .sort((left, right) => (workerCount.get(left) ?? 0) - (workerCount.get(right) ?? 0))[0];

      if (leastBusyWorker) {
        workerCount.set(leastBusyWorker, (workerCount.get(leastBusyWorker) ?? 0) + 1);
        entries.push({ name: leastBusyWorker, count: workerCount.get(leastBusyWorker) });
        scheduleMap.set(dayKey, entries);
        remainWork -= 1;
        assignedThisRound = true;
      }

      if (remainWork <= 0) {
        return { remainWork, warning: "" };
      }
    }

    if (!assignedThisRound) {
      if (currentMaxWorkers >= maxAllowedWorkers) {
        return {
          remainWork,
          warning: remainWork > 0 ? `모든 근무자가 최대치로 배치되었습니다. ${remainWork}개의 추가 근무는 배치하지 못했습니다.` : "",
        };
      }
      currentMaxWorkers += 1;
    }
  }
  return { remainWork: 0, warning: "" };
}

function generate(start, end, workers, holidays, customWorkdays, freeHolidayCount) {
  const scheduleMap = new Map();
  const workerQueue = [...workers];
  const workerCount = new Map(workers.map((worker) => [worker, 0]));

  const everyDays = eachDay(start, end);
  const workDays = getPriorityWorkDays(everyDays);
  const holidayKeys = new Set(holidays.map(toDateKey));
  const customWorkdayKeys = new Set(customWorkdays.keys());

  for (const day of workDays) {
    const dayKey = toDateKey(day);
    if (holidayKeys.has(dayKey)) {
      continue;
    }
    const baseWorkerCount = customWorkdays.get(dayKey) ?? 4;
    assignWorkers(scheduleMap, dayKey, baseWorkerCount, workerQueue, workerCount);
  }

  const nonWednesdayHolidays = holidays.filter((day) => day.getDay() !== 3);
  let remainWork = (nonWednesdayHolidays.length - freeHolidayCount) * 4;
  let warning = "";

  if (remainWork > 0) {
    const extraResult = assignExtraWorkersByPriority(
      scheduleMap,
      workDays,
      holidayKeys,
      customWorkdayKeys,
      workerCount,
      remainWork,
      workers,
    );
    remainWork = extraResult.remainWork;
    warning = extraResult.warning;
  }

  return { scheduleMap, warning, remainingExtraAssignments: remainWork };
}

function generateSchedule() {
  setError("");
  const range = getInputRange();
  if (!range) {
    return;
  }

  const workers = normalizeWorkers(elements.workersInput.value);
  if (workers.length === 0) {
    setError("근무 인원을 한 명 이상 입력해주세요.");
    clearResults();
    return;
  }

  const rangeStartKey = toDateKey(range.start);
  const rangeEndKey = toDateKey(range.end);
  const filteredCustomHolidays = state.customHolidays.filter((item) => item.date >= rangeStartKey && item.date <= rangeEndKey);
  const filteredCustomWorkdays = state.customWorkdays.filter((item) => item.date >= rangeStartKey && item.date <= rangeEndKey);
  const customWorkdayMap = new Map(filteredCustomWorkdays.map((item) => [item.date, item.workerCount]));

  if ([...customWorkdayMap.values()].some((count) => count > workers.length)) {
    setError("근무자 수보다 많은 커스텀 근무일 근무자 수가 있습니다.");
    clearResults();
    return;
  }

  const holidays = [
    ...getWednesdays(range.start, range.end),
    ...getSecondThursdays(range.start, range.end),
    ...getFourthThursdays(range.start, range.end),
    ...filteredCustomHolidays.map((item) => dateFromInput(item.date)),
  ].filter((date, index, array) => index === array.findIndex((candidate) => toDateKey(candidate) === toDateKey(date)));

  for (const customWorkdayDate of customWorkdayMap.keys()) {
    const index = holidays.findIndex((date) => toDateKey(date) === customWorkdayDate);
    if (index >= 0) {
      holidays.splice(index, 1);
    }
  }

  const freeHolidayCount = filteredCustomHolidays.filter((item) => item.isFree).length;
  const { scheduleMap, warning, remainingExtraAssignments } = generate(
    range.start,
    range.end,
    workers,
    holidays,
    customWorkdayMap,
    freeHolidayCount,
  );

  const holidayKeys = new Set(holidays.map(toDateKey));
  const workerTotals = new Map(workers.map((worker) => [worker, 0]));
  const workerDayCounts = new Map(workers.map((worker) => [worker, new Map()]));

  for (const [dayKey, entries] of scheduleMap.entries()) {
    const date = dateFromInput(dayKey);
    for (const entry of entries) {
      workerTotals.set(entry.name, (workerTotals.get(entry.name) ?? 0) + 1);
      const dayMap = workerDayCounts.get(entry.name);
      dayMap.set(date.getDay(), (dayMap.get(date.getDay()) ?? 0) + 1);
    }
  }

  const nonWednesdayHolidays = holidays.filter((day) => day.getDay() !== 3);
  const workFromHolidays = (nonWednesdayHolidays.length - freeHolidayCount) * 4;
  const totalAssignments = [...workerTotals.values()].reduce((sum, value) => sum + value, 0);

  state.latestResult = {
    start: range.start,
    end: range.end,
    workers,
    holidays,
    holidayKeys,
    scheduleMap,
    warning,
    remainingExtraAssignments,
    workerTotals,
    workerDayCounts,
    totalAssignments,
    workFromHolidays,
    totalDays: eachDay(range.start, range.end).length,
  };

  renderResults();
}

function clearResults() {
  state.latestResult = null;
  renderResults();
}

function renderSummary() {
  const target = elements.summaryGrid;
  target.innerHTML = "";
  if (!state.latestResult) {
    target.innerHTML = '<div class="empty-state">스케줄을 생성하면 여기에서 핵심 지표를 볼 수 있습니다.</div>';
    return;
  }

  const { start, end, scheduleMap, holidays, totalAssignments, workFromHolidays, warning } = state.latestResult;
  const cards = [
    {
      label: "기간",
      value: `${state.latestResult.totalDays}일`,
      note: `${formatDate(start)} ~ ${formatDate(end)}`,
    },
    {
      label: "근무일",
      value: `${scheduleMap.size}일`,
      note: `${totalAssignments - workFromHolidays}개의 기본 근무 포함`,
    },
    {
      label: "휴무일",
      value: `${holidays.length}일`,
      note: `${workFromHolidays}개의 추가 근무로 환산`,
    },
    {
      label: "총 근무 수",
      value: `${totalAssignments}회`,
      note: warning || "추가 배치까지 정상적으로 계산되었습니다.",
    },
  ];

  for (const card of cards) {
    const node = elements.summaryCardTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".summary-label").textContent = card.label;
    node.querySelector(".summary-value").textContent = card.value;
    node.querySelector(".summary-note").textContent = card.note;
    target.appendChild(node);
  }
}

function renderCalendar() {
  const target = elements.calendarGrid;
  target.innerHTML = "";
  if (!state.latestResult) {
    target.innerHTML = '<div class="empty-state">캘린더 미리보기가 여기에 표시됩니다.</div>';
    return;
  }

  const { start, end, holidayKeys, scheduleMap } = state.latestResult;
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1, 12);

  while (cursor <= lastMonth) {
    const monthCard = document.createElement("article");
    monthCard.className = "month-card";
    monthCard.innerHTML = `
      <h3>${formatMonthTitle(cursor.getFullYear(), cursor.getMonth())}</h3>
      <div class="month-header">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
      </div>
      <div class="month-days"></div>
    `;
    const daysContainer = monthCard.querySelector(".month-days");
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);

    for (let blank = 0; blank < firstDay.getDay(); blank += 1) {
      const empty = document.createElement("div");
      empty.className = "day-cell empty";
      daysContainer.appendChild(empty);
    }

    for (let dayNumber = 1; dayNumber <= lastDay.getDate(); dayNumber += 1) {
      const current = new Date(cursor.getFullYear(), cursor.getMonth(), dayNumber, 12);
      const key = toDateKey(current);
      const entries = scheduleMap.get(key) ?? [];
      const isInRange = current >= start && current <= end;
      const isHoliday = holidayKeys.has(key);
      const className = isInRange ? (isHoliday ? "day-cell holiday" : "day-cell workday") : "day-cell";
      const caption = !isInRange ? "" : isHoliday ? "휴무일" : `${entries.length}명 배치`;
      const cell = document.createElement("div");
      cell.className = className;
      cell.innerHTML = `
        <span class="day-number">${dayNumber}</span>
        <span class="day-caption">${caption}</span>
      `;
      daysContainer.appendChild(cell);
    }

    target.appendChild(monthCard);
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
  }
}

function renderSchedule() {
  const target = elements.scheduleList;
  target.innerHTML = "";
  if (!state.latestResult) {
    target.innerHTML = '<div class="empty-state">생성된 일자별 배치가 여기에 표시됩니다.</div>';
    return;
  }

  const { start, end, holidayKeys, scheduleMap } = state.latestResult;
  for (const day of eachDay(start, end)) {
    const key = toDateKey(day);
    const entries = scheduleMap.get(key) ?? [];
    const isHoliday = holidayKeys.has(key) && entries.length === 0;
    const card = document.createElement("article");
    card.className = "schedule-item";
    card.innerHTML = `
      <div class="schedule-top">
        <strong>${formatDate(day)}</strong>
        <span class="schedule-status ${isHoliday ? "holiday" : "work"}">
          ${isHoliday ? "휴무일" : `${entries.length}명 배치`}
        </span>
      </div>
      <div class="worker-chip-row"></div>
    `;

    const chips = card.querySelector(".worker-chip-row");
    if (isHoliday) {
      const chip = document.createElement("span");
      chip.className = "worker-chip";
      chip.textContent = "휴무";
      chips.appendChild(chip);
    } else {
      for (const entry of entries) {
        const chip = document.createElement("span");
        chip.className = "worker-chip";
        chip.textContent = `${entry.name} (${entry.count})`;
        chips.appendChild(chip);
      }
    }
    target.appendChild(card);
  }
}

function renderWorkerStats() {
  const target = elements.workerStats;
  target.innerHTML = "";
  if (!state.latestResult) {
    target.innerHTML = '<div class="empty-state">근무자별 통계가 여기에 표시됩니다.</div>';
    return;
  }

  const { workers, workerTotals, workerDayCounts } = state.latestResult;
  const maxAssignments = Math.max(...workers.map((worker) => workerTotals.get(worker) ?? 0), 1);

  for (const worker of workers) {
    const total = workerTotals.get(worker) ?? 0;
    const weekdayStats = workerDayCounts.get(worker) ?? new Map();
    const card = document.createElement("article");
    card.className = "worker-card";
    card.innerHTML = `
      <div class="worker-card-top">
        <div>
          <h3>${worker}</h3>
          <span class="subtle">총 ${total}회 배치</span>
        </div>
        <strong>${Math.round((total / maxAssignments) * 100)}%</strong>
      </div>
      <div class="bar-track"><div class="bar-fill"></div></div>
      <div class="weekday-row"></div>
    `;
    card.querySelector(".bar-fill").style.width = `${(total / maxAssignments) * 100}%`;
    const row = card.querySelector(".weekday-row");
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const pill = document.createElement("span");
      pill.className = "weekday-pill";
      pill.textContent = `${dayNames[dayIndex]} ${weekdayStats.get(dayIndex) ?? 0}`;
      row.appendChild(pill);
    }
    target.appendChild(card);
  }
}

function renderResults() {
  renderSummary();
  renderCalendar();
  renderSchedule();
  renderWorkerStats();
}

function syncDates() {
  if (elements.startDate.value && elements.endDate.value && elements.startDate.value > elements.endDate.value) {
    elements.endDate.value = elements.startDate.value;
  }
  updateAutoHolidayPreview();
}

function loadSampleData() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 28, 12);
  elements.startDate.value = toDateKey(start);
  elements.endDate.value = toDateKey(end);
  elements.workersInput.value = "AAA BBB CCC DDD EEE FFF";
  state.customHolidays = [];
  state.customWorkdays = [];
  upsertHoliday(toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 5, 12)), false);
  upsertHoliday(toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 12, 12)), true);
  upsertWorkday(toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 8, 12)), 5);
  renderEntryLists();
  generateSchedule();
}

elements.startDate.addEventListener("change", () => {
  syncDates();
  generateSchedule();
});

elements.endDate.addEventListener("change", () => {
  if (elements.startDate.value && elements.endDate.value && elements.endDate.value < elements.startDate.value) {
    elements.startDate.value = elements.endDate.value;
  }
  updateAutoHolidayPreview();
  generateSchedule();
});

elements.workersInput.addEventListener("input", () => generateSchedule());
elements.generateBtn.addEventListener("click", () => generateSchedule());
elements.loadSampleBtn.addEventListener("click", () => loadSampleData());

elements.addHolidayBtn.addEventListener("click", () => {
  if (!elements.holidayDateInput.value) {
    setError("커스텀 휴무일 날짜를 선택해주세요.");
    return;
  }
  upsertHoliday(elements.holidayDateInput.value, elements.holidayFreeInput.checked);
  elements.holidayDateInput.value = "";
  elements.holidayFreeInput.checked = false;
  renderEntryLists();
  generateSchedule();
});

elements.addWorkdayBtn.addEventListener("click", () => {
  const count = Number(elements.workdayCountInput.value);
  if (!elements.workdayDateInput.value) {
    setError("커스텀 근무일 날짜를 선택해주세요.");
    return;
  }
  if (!Number.isInteger(count) || count <= 0) {
    setError("근무자 수는 1 이상의 정수여야 합니다.");
    return;
  }
  upsertWorkday(elements.workdayDateInput.value, count);
  elements.workdayDateInput.value = "";
  elements.workdayCountInput.value = "4";
  renderEntryLists();
  generateSchedule();
});

(function init() {
  loadSampleData();
  renderResults();
  updateAutoHolidayPreview();
})();
