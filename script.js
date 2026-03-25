const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
const dayTokenMap = {
  일: 0,
  sun: 0,
  sunday: 0,
  월: 1,
  mon: 1,
  monday: 1,
  화: 2,
  tue: 2,
  tuesday: 2,
  수: 3,
  wed: 3,
  wednesday: 3,
  목: 4,
  thu: 4,
  thursday: 4,
  금: 5,
  fri: 5,
  friday: 5,
  토: 6,
  sat: 6,
  saturday: 6,
};
const defaultPriority = [6, 0, 1, 5, 2, 4, 3];
const defaultWeeklyHolidayDays = [3];
const defaultNthRules = [
  { nth: 2, day: 4 },
  { nth: 4, day: 4 },
];

const state = {
  customHolidays: [],
  customWorkdays: [],
  latestResult: null,
  activeTab: "visual",
};

const elements = {
  startDate: document.querySelector("#startDate"),
  endDate: document.querySelector("#endDate"),
  workersInput: document.querySelector("#workersInput"),
  priorityList: document.querySelector("#priorityList"),
  nthRulesList: document.querySelector("#nthRulesList"),
  addNthRuleBtn: document.querySelector("#addNthRuleBtn"),
  weeklyHolidayChecks: document.querySelector("#weeklyHolidayChecks"),
  errorText: document.querySelector("#errorText"),
  weeklyHolidayList: document.querySelector("#weeklyHolidayList"),
  nthHolidayList: document.querySelector("#nthHolidayList"),
  weeklyRuleSummary: document.querySelector("#weeklyRuleSummary"),
  nthRuleSummary: document.querySelector("#nthRuleSummary"),
  holidayCountBadge: document.querySelector("#holidayCountBadge"),
  holidayDateInput: document.querySelector("#holidayDateInput"),
  holidayFreeInput: document.querySelector("#holidayFreeInput"),
  addHolidayBtn: document.querySelector("#addHolidayBtn"),
  customHolidayList: document.querySelector("#customHolidayList"),
  workdayDateInput: document.querySelector("#workdayDateInput"),
  workdayCountInput: document.querySelector("#workdayCountInput"),
  addWorkdayBtn: document.querySelector("#addWorkdayBtn"),
  customWorkdayList: document.querySelector("#customWorkdayList"),
  loadSampleBtn: document.querySelector("#loadSampleBtn"),
  summaryGrid: document.querySelector("#summaryGrid"),
  calendarGrid: document.querySelector("#calendarGrid"),
  scheduleList: document.querySelector("#scheduleList"),
  workerStats: document.querySelector("#workerStats"),
  outputText: document.querySelector("#outputText"),
  statisticText: document.querySelector("#statisticText"),
  summaryCardTemplate: document.querySelector("#summaryCardTemplate"),
  resultTabs: document.querySelector("#resultTabs"),
  visualTab: document.querySelector("#visualTab"),
  textTab: document.querySelector("#textTab"),
};

function dateFromInput(value) {
  return new Date(`${value}T12:00:00`);
}

function cloneDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
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

function eachDay(start, end) {
  const days = [];
  for (let day = cloneDate(start); day <= end; day.setDate(day.getDate() + 1)) {
    days.push(cloneDate(day));
  }
  return days;
}

function setError(message) {
  elements.errorText.textContent = message || "";
}

function normalizeWorkers(raw) {
  return raw.split(/\s+/).map((value) => value.trim()).filter(Boolean);
}

function parseDayToken(token) {
  return dayTokenMap[token.trim().toLowerCase()] ?? dayTokenMap[token.trim()] ?? null;
}

function formatPriority(order) {
  return order.map((day) => dayNames[day]).join(" → ");
}

function readPriorityOrder() {
  const values = [...elements.priorityList.querySelectorAll(".priority-item")].map((item) => Number(item.dataset.day));
  return values.length === 7 ? values : [...defaultPriority];
}

function parseWeeklyHolidayDays() {
  return [...elements.weeklyHolidayChecks.querySelectorAll("input:checked")]
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function readNthRuleRows() {
  return [...elements.nthRulesList.querySelectorAll(".rule-row")].map((row) => ({
    nth: Number(row.querySelector(".nth-select").value),
    day: Number(row.querySelector(".day-select").value),
  }));
}

function parseNthRules() {
  const rules = readNthRuleRows().filter((rule) => Number.isInteger(rule.nth) && rule.nth > 0 && rule.nth <= 5 && Number.isInteger(rule.day));
  return { rules, usedDefault: false, error: "" };
}

function getNthWeekdayDates(start, end, nth, weekday) {
  const result = [];
  let current = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  while (current <= end) {
    const firstDay = cloneDate(current);
    while (firstDay.getDay() !== weekday) {
      firstDay.setDate(firstDay.getDate() + 1);
    }
    const target = cloneDate(firstDay);
    target.setDate(target.getDate() + (nth - 1) * 7);
    if (target.getMonth() === current.getMonth() && target >= start && target <= end) {
      result.push(target);
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1, 12);
  }
  return result;
}

function getAutomaticHolidayGroups(start, end, weeklyHolidayDays, nthRules) {
  const days = eachDay(start, end);
  const weeklyDates = days.filter((date) => weeklyHolidayDays.includes(date.getDay()));
  const nthDates = nthRules.flatMap((rule) => getNthWeekdayDates(start, end, rule.nth, rule.day));
  return {
    weeklyDates,
    nthDates,
  };
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

function renderDatePills(target, dates) {
  target.innerHTML = "";
  if (dates.length === 0) {
    target.innerHTML = '<div class="empty-state">해당 규칙으로 생성된 휴무일이 없습니다.</div>';
    return;
  }
  for (const date of dates.slice(0, 18)) {
    const pill = document.createElement("span");
    pill.className = "date-pill";
    pill.textContent = formatDate(date);
    target.appendChild(pill);
  }
  if (dates.length > 18) {
    const pill = document.createElement("span");
    pill.className = "date-pill";
    pill.textContent = `외 ${dates.length - 18}일`;
    target.appendChild(pill);
  }
}

function renderCustomHolidayList() {
  const target = elements.customHolidayList;
  target.innerHTML = "";
  if (state.customHolidays.length === 0) {
    target.innerHTML = '<div class="empty-state">추가된 커스텀 휴무일이 없습니다.</div>';
    return;
  }

  for (const item of state.customHolidays) {
    const row = document.createElement("div");
    row.className = "entry-item";
    row.innerHTML = `
      <div class="entry-meta">
        <strong>${item.date}</strong>
        <span>${item.isFree ? "무료휴일" : "일반 휴무일"}</span>
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
    const row = document.createElement("div");
    row.className = "entry-item";
    row.innerHTML = `
      <div class="entry-meta">
        <strong>${item.date}</strong>
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

function updateAutoHolidayPreview() {
  const range = getInputRange();
  if (!range) {
    elements.holidayCountBadge.textContent = "0일";
    elements.weeklyHolidayList.innerHTML = '<div class="empty-state">기간을 먼저 선택하세요.</div>';
    elements.nthHolidayList.innerHTML = '<div class="empty-state">기간을 먼저 선택하세요.</div>';
    elements.weeklyRuleSummary.textContent = "";
    elements.nthRuleSummary.textContent = "";
    return;
  }

  const weeklyHolidayDays = parseWeeklyHolidayDays();
  const nthRuleResult = parseNthRules();
  const autoGroups = getAutomaticHolidayGroups(range.start, range.end, weeklyHolidayDays, nthRuleResult.rules);

  const customHolidayKeys = new Set(state.customHolidays.map((item) => item.date));
  const customWorkdayKeys = new Set(state.customWorkdays.map((item) => item.date));

  const weeklyDates = autoGroups.weeklyDates.filter((date) => {
    const key = toDateKey(date);
    return !customHolidayKeys.has(key) && !customWorkdayKeys.has(key);
  });
  const nthDates = autoGroups.nthDates.filter((date) => {
    const key = toDateKey(date);
    return !customHolidayKeys.has(key) && !customWorkdayKeys.has(key);
  });

  elements.weeklyRuleSummary.textContent = weeklyHolidayDays.length > 0
    ? weeklyHolidayDays.map((day) => `매주 ${dayNames[day]}`).join(", ")
    : "선택된 주간 자동 휴무 없음";
  elements.nthRuleSummary.textContent = nthRuleResult.rules.length > 0
    ? nthRuleResult.rules.map((rule) => `매월 ${rule.nth}번째 ${dayNames[rule.day]}`).join(", ")
    : "선택된 월별 자동 휴무 없음";

  const allHolidayKeys = new Set([
    ...weeklyDates.map(toDateKey),
    ...nthDates.map(toDateKey),
    ...state.customHolidays.map((item) => item.date),
  ]);

  elements.holidayCountBadge.textContent = `${allHolidayKeys.size}일`;
  renderDatePills(elements.weeklyHolidayList, weeklyDates);
  renderDatePills(elements.nthHolidayList, nthDates);
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
          warning: remainWork > 0 ? `추가 근무 ${remainWork}개는 배치하지 못했습니다.` : "",
        };
      }
      currentMaxWorkers += 1;
    }
  }

  return { remainWork: 0, warning: "" };
}

function generate(start, end, workers, holidays, customWorkdays, freeHolidayCount, priorityOrder) {
  const scheduleMap = new Map();
  const workerQueue = [...workers];
  const workerCount = new Map(workers.map((worker) => [worker, 0]));
  const holidayKeys = new Set(holidays.map(toDateKey));
  const customWorkdayKeys = new Set(customWorkdays.keys());
  const workDays = [];
  const allDays = eachDay(start, end);

  for (const dayValue of priorityOrder) {
    workDays.push(...allDays.filter((date) => date.getDay() === dayValue));
  }

  for (const day of workDays) {
    const dayKey = toDateKey(day);
    if (holidayKeys.has(dayKey)) {
      continue;
    }
    const baseWorkerCount = customWorkdays.get(dayKey) ?? 4;
    assignWorkers(scheduleMap, dayKey, baseWorkerCount, workerQueue, workerCount);
  }

  const nonWeeklyHolidayKeys = holidays.filter((day) => day.getDay() !== 3);
  let remainWork = (nonWeeklyHolidayKeys.length - freeHolidayCount) * 4;
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

function buildTexts(result) {
  const { start, end, scheduleMap, holidayKeys, workerTotals, workerDayCounts, workers, holidays, totalAssignments, workFromHolidays, priorityOrder, weeklyHolidayDays, nthRules, warning } = result;
  let outputText = "";
  let statisticText = "";

  statisticText += "<배치 규칙>\n";
  statisticText += `- 기본 배치: 각 근무일에 4명 또는 커스텀 인원 수만큼 순환 배치\n`;
  statisticText += `- 배치 우선순위: ${formatPriority(priorityOrder)}\n`;
  statisticText += `- 주간 자동 휴무: ${weeklyHolidayDays.length > 0 ? weeklyHolidayDays.map((day) => dayNames[day]).join(", ") : "없음"}\n`;
  statisticText += `- 월별 자동 휴무: ${nthRules.length > 0 ? nthRules.map((rule) => `${rule.nth}번째 ${dayNames[rule.day]}`).join(", ") : "없음"}\n`;
  statisticText += `- 추가 배치: 휴무일 수(무료휴일 제외) × 4\n`;
  if (warning) {
    statisticText += `- 경고: ${warning}\n`;
  }

  statisticText += "\n<인원별 통계>\n";
  for (const worker of workers) {
    const weekdayStats = workerDayCounts.get(worker) ?? new Map();
    const perDayText = dayNames.map((name, index) => `${name} ${weekdayStats.get(index) ?? 0}`).join(", ");
    statisticText += `- ${worker} (${workerTotals.get(worker) ?? 0}) : ${perDayText}\n`;
  }

  statisticText += "\n<종합 통계>\n";
  statisticText += `- 기간: ${formatDate(start)} ~ ${formatDate(end)}, 총 ${result.totalDays}일\n`;
  statisticText += `- 근무일: ${scheduleMap.size}일\n`;
  statisticText += `- 휴무일: ${holidays.length}일\n`;
  statisticText += `- 휴무일 보정 근무: ${workFromHolidays}회\n`;
  statisticText += `- 총 근무 수: ${totalAssignments}회\n`;

  for (const day of eachDay(start, end)) {
    const key = toDateKey(day);
    if (scheduleMap.has(key)) {
      const workersOfDay = scheduleMap.get(key).map((entry) => `${entry.name}(${entry.count})`).join(", ");
      outputText += `${formatDate(day)} [${scheduleMap.get(key).length}] : ${workersOfDay}\n`;
    } else if (holidayKeys.has(key)) {
      outputText += `${formatDate(day)} : 휴무일\n`;
    } else {
      outputText += `${formatDate(day)} : 미배치\n`;
    }
  }

  return { outputText, statisticText };
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

  const priorityResult = { order: readPriorityOrder(), usedDefault: false, error: "" };
  const nthRuleResult = parseNthRules();
  const weeklyHolidayDays = parseWeeklyHolidayDays();

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

  const autoGroups = getAutomaticHolidayGroups(range.start, range.end, weeklyHolidayDays, nthRuleResult.rules);
  const holidays = [
    ...autoGroups.weeklyDates,
    ...autoGroups.nthDates,
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
    priorityResult.order,
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
  const texts = buildTexts({
    start: range.start,
    end: range.end,
    scheduleMap,
    holidayKeys,
    workerTotals,
    workerDayCounts,
    workers,
    holidays,
    totalAssignments,
    workFromHolidays,
    priorityOrder: priorityResult.order,
    weeklyHolidayDays,
    nthRules: nthRuleResult.rules,
    totalDays: eachDay(range.start, range.end).length,
    warning,
  });

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
    priorityOrder: priorityResult.order,
    weeklyHolidayDays,
    nthRules: nthRuleResult.rules,
    outputText: texts.outputText,
    statisticText: texts.statisticText,
  };

  const errors = [priorityResult.error, nthRuleResult.error].filter(Boolean);
  if (errors.length > 0) {
    setError(errors.join(" "));
  }

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
    target.innerHTML = '<div class="empty-state">스케줄을 생성하면 핵심 지표가 여기에 표시됩니다.</div>';
    return;
  }

  const { start, end, scheduleMap, holidays, totalAssignments, workFromHolidays, priorityOrder } = state.latestResult;
  const cards = [
    { label: "기간", value: `${state.latestResult.totalDays}일`, note: `${toDateKey(start)} ~ ${toDateKey(end)}` },
    { label: "근무일", value: `${scheduleMap.size}일`, note: `${totalAssignments - workFromHolidays}회 기본 근무` },
    { label: "휴무일", value: `${holidays.length}일`, note: `${workFromHolidays}회 추가 근무 환산` },
    { label: "우선순위", value: formatPriority(priorityOrder), note: state.latestResult.warning || "현재 설정 기준 계산 완료" },
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
    target.innerHTML = '<div class="empty-state">캘린더가 여기에 표시됩니다.</div>';
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
      const cell = document.createElement("div");
      cell.className = isInRange ? (isHoliday ? "day-cell holiday" : "day-cell workday") : "day-cell";
      const caption = !isInRange ? "" : isHoliday ? "휴무" : `${entries.length}명`;
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
    target.innerHTML = '<div class="empty-state">일자별 배치가 여기에 표시됩니다.</div>';
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
        <span class="schedule-status ${isHoliday ? "holiday" : "work"}">${isHoliday ? "휴무일" : `${entries.length}명 배치`}</span>
      </div>
      <div class="worker-chip-row"></div>
    `;

    const row = card.querySelector(".worker-chip-row");
    if (isHoliday) {
      row.innerHTML = '<span class="worker-chip">휴무</span>';
    } else {
      for (const entry of entries) {
        const chip = document.createElement("span");
        chip.className = "worker-chip";
        chip.textContent = `${entry.name} (${entry.count})`;
        row.appendChild(chip);
      }
    }
    target.appendChild(card);
  }
}

function renderWorkerStats() {
  const target = elements.workerStats;
  target.innerHTML = "";
  if (!state.latestResult) {
    target.innerHTML = '<div class="empty-state">인원별 통계가 여기에 표시됩니다.</div>';
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

function renderTextResults() {
  if (!state.latestResult) {
    elements.outputText.textContent = "생성된 텍스트 출력이 없습니다.";
    elements.statisticText.textContent = "생성된 통계 텍스트가 없습니다.";
    return;
  }
  elements.outputText.textContent = state.latestResult.outputText;
  elements.statisticText.textContent = state.latestResult.statisticText;
}

function renderResults() {
  renderSummary();
  renderCalendar();
  renderSchedule();
  renderWorkerStats();
  renderTextResults();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  for (const button of elements.resultTabs.querySelectorAll(".tab-button")) {
    button.classList.toggle("active", button.dataset.tab === tab);
  }
  elements.visualTab.classList.toggle("active", tab === "visual");
  elements.textTab.classList.toggle("active", tab === "text");
}

function syncDates() {
  if (elements.startDate.value && elements.endDate.value && elements.startDate.value > elements.endDate.value) {
    elements.endDate.value = elements.startDate.value;
  }
  updateAutoHolidayPreview();
}

function getNextQuarterEnd(fromDate) {
  const year = fromDate.getFullYear();
  const candidates = [
    new Date(year, 2, 31, 12),
    new Date(year, 5, 30, 12),
    new Date(year, 8, 30, 12),
    new Date(year, 11, 31, 12),
    new Date(year + 1, 2, 31, 12),
  ];
  const upcoming = candidates.filter((date) => date >= fromDate);
  return upcoming[1] ?? upcoming[upcoming.length - 1] ?? candidates[candidates.length - 1];
}

function buildWeeklyHolidayChecks() {
  elements.weeklyHolidayChecks.innerHTML = "";
  for (let day = 0; day < 7; day += 1) {
    const label = document.createElement("label");
    label.className = "weekday-option";
    label.innerHTML = `<input type="checkbox" value="${day}"> <span>${dayNames[day]}</span>`;
    if (defaultWeeklyHolidayDays.includes(day)) {
      label.querySelector("input").checked = true;
    }
    label.querySelector("input").addEventListener("change", () => {
      updateAutoHolidayPreview();
      generateSchedule();
    });
    elements.weeklyHolidayChecks.appendChild(label);
  }
}

function renderPriorityEditor(order = defaultPriority) {
  elements.priorityList.innerHTML = "";
  order.forEach((day, index) => {
    const item = document.createElement("div");
    item.className = "priority-item";
    item.dataset.day = String(day);
    item.draggable = true;
    item.innerHTML = `
      <span class="priority-rank">${index + 1}</span>
      <span class="priority-day">${dayNames[day]}요일</span>
      <span class="priority-grip" aria-hidden="true">⋮⋮</span>
    `;
    item.addEventListener("dragstart", () => {
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      elements.priorityList.querySelectorAll(".drag-over").forEach((node) => node.classList.remove("drag-over"));
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      elements.priorityList.querySelectorAll(".drag-over").forEach((node) => node.classList.remove("drag-over"));
      item.classList.add("drag-over");
    });
    item.addEventListener("dragleave", () => {
      item.classList.remove("drag-over");
    });
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      const dragged = elements.priorityList.querySelector(".dragging");
      item.classList.remove("drag-over");
      if (!dragged || dragged === item) {
        return;
      }
      const orderValues = readPriorityOrder();
      const draggedDay = Number(dragged.dataset.day);
      const targetDay = Number(item.dataset.day);
      const draggedIndex = orderValues.indexOf(draggedDay);
      const targetIndex = orderValues.indexOf(targetDay);
      if (draggedIndex < 0 || targetIndex < 0) {
        return;
      }
      orderValues.splice(draggedIndex, 1);
      orderValues.splice(targetIndex, 0, draggedDay);
      renderPriorityEditor(orderValues);
      updateAutoHolidayPreview();
      generateSchedule();
    });
    elements.priorityList.appendChild(item);
  });
}

function createNthRuleRow(rule = { nth: 2, day: 4 }) {
  const row = document.createElement("div");
  row.className = "rule-row";
  row.innerHTML = `
    <select class="nth-select" aria-label="몇 번째 주">
      <option value="1">1번째</option>
      <option value="2">2번째</option>
      <option value="3">3번째</option>
      <option value="4">4번째</option>
      <option value="5">5번째</option>
    </select>
    <select class="day-select" aria-label="요일">
      <option value="0">일요일</option>
      <option value="1">월요일</option>
      <option value="2">화요일</option>
      <option value="3">수요일</option>
      <option value="4">목요일</option>
      <option value="5">금요일</option>
      <option value="6">토요일</option>
    </select>
    <button class="danger-button remove-rule-button" type="button">삭제</button>
  `;
  row.querySelector(".nth-select").value = String(rule.nth);
  row.querySelector(".day-select").value = String(rule.day);
  row.querySelector(".nth-select").addEventListener("change", () => {
    updateAutoHolidayPreview();
    generateSchedule();
  });
  row.querySelector(".day-select").addEventListener("change", () => {
    updateAutoHolidayPreview();
    generateSchedule();
  });
  row.querySelector(".remove-rule-button").addEventListener("click", () => {
    row.remove();
    updateAutoHolidayPreview();
    generateSchedule();
  });
  return row;
}

function renderNthRuleEditor(rules = defaultNthRules) {
  elements.nthRulesList.innerHTML = "";
  for (const rule of rules) {
    elements.nthRulesList.appendChild(createNthRuleRow(rule));
  }
}

function loadSampleData() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const end = getNextQuarterEnd(start);
  elements.startDate.value = toDateKey(start);
  elements.endDate.value = toDateKey(end);
  elements.workersInput.value = "최다은 김서준 박지우 이현우 한서윤";
  state.customHolidays = [];
  state.customWorkdays = [];
  buildWeeklyHolidayChecks();
  renderPriorityEditor(defaultPriority);
  renderNthRuleEditor(defaultNthRules);
  upsertHoliday(toDateKey(new Date(start.getFullYear(), start.getMonth(), 8, 12)), false);
  upsertHoliday(toDateKey(new Date(start.getFullYear(), start.getMonth() + 1, 15, 12)), true);
  upsertWorkday(toDateKey(new Date(start.getFullYear(), start.getMonth(), 11, 12)), 5);
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
elements.loadSampleBtn.addEventListener("click", () => loadSampleData());
elements.addNthRuleBtn.addEventListener("click", () => {
  elements.nthRulesList.appendChild(createNthRuleRow({ nth: 2, day: 4 }));
  updateAutoHolidayPreview();
  generateSchedule();
});

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

elements.resultTabs.addEventListener("click", (event) => {
  const button = event.target.closest(".tab-button");
  if (!button) {
    return;
  }
  setActiveTab(button.dataset.tab);
});

(function init() {
  buildWeeklyHolidayChecks();
  renderPriorityEditor(defaultPriority);
  setActiveTab("visual");
  loadSampleData();
})();
