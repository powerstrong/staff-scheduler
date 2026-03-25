const dayNames = ["ÀÏ", "¿ù", "È­", "¼ö", "¸ñ", "±Ý", "Åä"];
const dayTokenMap = {
  ÀÏ: 0,
  sun: 0,
  sunday: 0,
  ¿ù: 1,
  mon: 1,
  monday: 1,
  È­: 2,
  tue: 2,
  tuesday: 2,
  ¼ö: 3,
  wed: 3,
  wednesday: 3,
  ¸ñ: 4,
  thu: 4,
  thursday: 4,
  ±Ý: 5,
  fri: 5,
  friday: 5,
  Åä: 6,
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
  priorityInput: document.querySelector("#priorityInput"),
  nthRulesInput: document.querySelector("#nthRulesInput"),
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
  generateBtn: document.querySelector("#generateBtn"),
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
  return order.map((day) => dayNames[day]).join(" ¡æ ");
}

function parsePriority(raw) {
  const tokens = raw.split(/[\s,>/-]+/).map((value) => value.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { order: [...defaultPriority], usedDefault: true, error: "" };
  }

  const parsed = tokens.map(parseDayToken);
  if (parsed.some((day) => day === null) || new Set(parsed).size !== 7) {
    return {
      order: [...defaultPriority],
      usedDefault: true,
      error: "¹èÄ¡ ¿ì¼±¼øÀ§´Â ÀÏ~Åä 7°³ ¿äÀÏÀ» ÇÑ ¹ø¾¿ ÀÔ·ÂÇØ¾ß ÇØ¼­ ±âº»°ªÀ¸·Î °è»êÇß½À´Ï´Ù.",
    };
  }

  return { order: parsed, usedDefault: false, error: "" };
}

function parseWeeklyHolidayDays() {
  return [...elements.weeklyHolidayChecks.querySelectorAll("input:checked")]
    .map((input) => Number(input.value))
    .sort((a, b) => a - b);
}

function parseNthRules(raw) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { rules: [...defaultNthRules], usedDefault: true, error: "" };
  }

  const rules = [];
  for (const line of lines) {
    const match = line.match(/^(\d+)\s*([°¡-ÆRA-Za-z]+)$/);
    if (!match) {
      return {
        rules: [...defaultNthRules],
        usedDefault: true,
        error: "¿ùº° ÀÚµ¿ ÈÞ¹« ±ÔÄ¢ Çü½ÄÀÌ ¿Ã¹Ù¸£Áö ¾Ê¾Æ ±âº»°ªÀ¸·Î °è»êÇß½À´Ï´Ù. ¿¹: 2 ¸ñ",
      };
    }
    const nth = Number(match[1]);
    const day = parseDayToken(match[2]);
    if (!Number.isInteger(nth) || nth <= 0 || nth > 5 || day === null) {
      return {
        rules: [...defaultNthRules],
        usedDefault: true,
        error: "¿ùº° ÀÚµ¿ ÈÞ¹« ±ÔÄ¢ Çü½ÄÀÌ ¿Ã¹Ù¸£Áö ¾Ê¾Æ ±âº»°ªÀ¸·Î °è»êÇß½À´Ï´Ù. ¿¹: 2 ¸ñ",
      };
    }
    rules.push({ nth, day });
  }

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
    target.innerHTML = '<div class="empty-state">ÇØ´ç ±ÔÄ¢À¸·Î »ý¼ºµÈ ÈÞ¹«ÀÏÀÌ ¾ø½À´Ï´Ù.</div>';
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
    pill.textContent = `¿Ü ${dates.length - 18}ÀÏ`;
    target.appendChild(pill);
  }
}

function renderCustomHolidayList() {
  const target = elements.customHolidayList;
  target.innerHTML = "";
  if (state.customHolidays.length === 0) {
    target.innerHTML = '<div class="empty-state">Ãß°¡µÈ Ä¿½ºÅÒ ÈÞ¹«ÀÏÀÌ ¾ø½À´Ï´Ù.</div>';
    return;
  }

  for (const item of state.customHolidays) {
    const row = document.createElement("div");
    row.className = "entry-item";
    row.innerHTML = `
      <div class="entry-meta">
        <strong>${item.date}</strong>
        <span>${item.isFree ? "¹«·áÈÞÀÏ" : "ÀÏ¹Ý ÈÞ¹«ÀÏ"}</span>
      </div>
      <button class="danger-button" type="button">»èÁ¦</button>
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
    target.innerHTML = '<div class="empty-state">Ãß°¡µÈ Ä¿½ºÅÒ ±Ù¹«ÀÏÀÌ ¾ø½À´Ï´Ù.</div>';
    return;
  }

  for (const item of state.customWorkdays) {
    const row = document.createElement("div");
    row.className = "entry-item";
    row.innerHTML = `
      <div class="entry-meta">
        <strong>${item.date}</strong>
        <span>${item.workerCount}¸í ¹èÄ¡</span>
      </div>
      <button class="danger-button" type="button">»èÁ¦</button>
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
    elements.holidayCountBadge.textContent = "0ÀÏ";
    elements.weeklyHolidayList.innerHTML = '<div class="empty-state">±â°£À» ¸ÕÀú ¼±ÅÃÇÏ¼¼¿ä.</div>';
    elements.nthHolidayList.innerHTML = '<div class="empty-state">±â°£À» ¸ÕÀú ¼±ÅÃÇÏ¼¼¿ä.</div>';
    elements.weeklyRuleSummary.textContent = "";
    elements.nthRuleSummary.textContent = "";
    return;
  }

  const weeklyHolidayDays = parseWeeklyHolidayDays();
  const nthRuleResult = parseNthRules(elements.nthRulesInput.value);
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
    ? weeklyHolidayDays.map((day) => `¸ÅÁÖ ${dayNames[day]}`).join(", ")
    : "¼±ÅÃµÈ ÁÖ°£ ÀÚµ¿ ÈÞ¹« ¾øÀ½";
  elements.nthRuleSummary.textContent = nthRuleResult.rules.length > 0
    ? nthRuleResult.rules.map((rule) => `¸Å¿ù ${rule.nth}¹øÂ° ${dayNames[rule.day]}`).join(", ")
    : "¼±ÅÃµÈ ¿ùº° ÀÚµ¿ ÈÞ¹« ¾øÀ½";

  const allHolidayKeys = new Set([
    ...weeklyDates.map(toDateKey),
    ...nthDates.map(toDateKey),
    ...state.customHolidays.map((item) => item.date),
  ]);

  elements.holidayCountBadge.textContent = `${allHolidayKeys.size}ÀÏ`;
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
          warning: remainWork > 0 ? `Ãß°¡ ±Ù¹« ${remainWork}°³´Â ¹èÄ¡ÇÏÁö ¸øÇß½À´Ï´Ù.` : "",
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

  statisticText += "<¹èÄ¡ ±ÔÄ¢>\n";
  statisticText += `- ±âº» ¹èÄ¡: °¢ ±Ù¹«ÀÏ¿¡ 4¸í ¶Ç´Â Ä¿½ºÅÒ ÀÎ¿ø ¼ö¸¸Å­ ¼øÈ¯ ¹èÄ¡\n`;
  statisticText += `- ¹èÄ¡ ¿ì¼±¼øÀ§: ${formatPriority(priorityOrder)}\n`;
  statisticText += `- ÁÖ°£ ÀÚµ¿ ÈÞ¹«: ${weeklyHolidayDays.length > 0 ? weeklyHolidayDays.map((day) => dayNames[day]).join(", ") : "¾øÀ½"}\n`;
  statisticText += `- ¿ùº° ÀÚµ¿ ÈÞ¹«: ${nthRules.length > 0 ? nthRules.map((rule) => `${rule.nth}¹øÂ° ${dayNames[rule.day]}`).join(", ") : "¾øÀ½"}\n`;
  statisticText += `- Ãß°¡ ¹èÄ¡: ÈÞ¹«ÀÏ ¼ö(¹«·áÈÞÀÏ Á¦¿Ü) ¡¿ 4\n`;
  if (warning) {
    statisticText += `- °æ°í: ${warning}\n`;
  }

  statisticText += "\n<ÀÎ¿øº° Åë°è>\n";
  for (const worker of workers) {
    const weekdayStats = workerDayCounts.get(worker) ?? new Map();
    const perDayText = dayNames.map((name, index) => `${name} ${weekdayStats.get(index) ?? 0}`).join(", ");
    statisticText += `- ${worker} (${workerTotals.get(worker) ?? 0}) : ${perDayText}\n`;
  }

  statisticText += "\n<Á¾ÇÕ Åë°è>\n";
  statisticText += `- ±â°£: ${formatDate(start)} ~ ${formatDate(end)}, ÃÑ ${result.totalDays}ÀÏ\n`;
  statisticText += `- ±Ù¹«ÀÏ: ${scheduleMap.size}ÀÏ\n`;
  statisticText += `- ÈÞ¹«ÀÏ: ${holidays.length}ÀÏ\n`;
  statisticText += `- ÈÞ¹«ÀÏ º¸Á¤ ±Ù¹«: ${workFromHolidays}È¸\n`;
  statisticText += `- ÃÑ ±Ù¹« ¼ö: ${totalAssignments}È¸\n`;

  for (const day of eachDay(start, end)) {
    const key = toDateKey(day);
    if (scheduleMap.has(key)) {
      const workersOfDay = scheduleMap.get(key).map((entry) => `${entry.name}(${entry.count})`).join(", ");
      outputText += `${formatDate(day)} [${scheduleMap.get(key).length}] : ${workersOfDay}\n`;
    } else if (holidayKeys.has(key)) {
      outputText += `${formatDate(day)} : ÈÞ¹«ÀÏ\n`;
    } else {
      outputText += `${formatDate(day)} : ¹Ì¹èÄ¡\n`;
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
    setError("±Ù¹« ÀÎ¿øÀ» ÇÑ ¸í ÀÌ»ó ÀÔ·ÂÇØÁÖ¼¼¿ä.");
    clearResults();
    return;
  }

  const priorityResult = parsePriority(elements.priorityInput.value);
  const nthRuleResult = parseNthRules(elements.nthRulesInput.value);
  const weeklyHolidayDays = parseWeeklyHolidayDays();

  const rangeStartKey = toDateKey(range.start);
  const rangeEndKey = toDateKey(range.end);
  const filteredCustomHolidays = state.customHolidays.filter((item) => item.date >= rangeStartKey && item.date <= rangeEndKey);
  const filteredCustomWorkdays = state.customWorkdays.filter((item) => item.date >= rangeStartKey && item.date <= rangeEndKey);
  const customWorkdayMap = new Map(filteredCustomWorkdays.map((item) => [item.date, item.workerCount]));

  if ([...customWorkdayMap.values()].some((count) => count > workers.length)) {
    setError("±Ù¹«ÀÚ ¼öº¸´Ù ¸¹Àº Ä¿½ºÅÒ ±Ù¹«ÀÏ ±Ù¹«ÀÚ ¼ö°¡ ÀÖ½À´Ï´Ù.");
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
    target.innerHTML = '<div class="empty-state">½ºÄÉÁÙÀ» »ý¼ºÇÏ¸é ÇÙ½É ÁöÇ¥°¡ ¿©±â¿¡ Ç¥½ÃµË´Ï´Ù.</div>';
    return;
  }

  const { start, end, scheduleMap, holidays, totalAssignments, workFromHolidays, priorityOrder } = state.latestResult;
  const cards = [
    { label: "±â°£", value: `${state.latestResult.totalDays}ÀÏ`, note: `${toDateKey(start)} ~ ${toDateKey(end)}` },
    { label: "±Ù¹«ÀÏ", value: `${scheduleMap.size}ÀÏ`, note: `${totalAssignments - workFromHolidays}È¸ ±âº» ±Ù¹«` },
    { label: "ÈÞ¹«ÀÏ", value: `${holidays.length}ÀÏ`, note: `${workFromHolidays}È¸ Ãß°¡ ±Ù¹« È¯»ê` },
    { label: "¿ì¼±¼øÀ§", value: formatPriority(priorityOrder), note: state.latestResult.warning || "ÇöÀç ¼³Á¤ ±âÁØ °è»ê ¿Ï·á" },
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
    target.innerHTML = '<div class="empty-state">Ä¶¸°´õ°¡ ¿©±â¿¡ Ç¥½ÃµË´Ï´Ù.</div>';
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
        <span>ÀÏ</span><span>¿ù</span><span>È­</span><span>¼ö</span><span>¸ñ</span><span>±Ý</span><span>Åä</span>
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
      const caption = !isInRange ? "" : isHoliday ? "ÈÞ¹«" : `${entries.length}¸í`;
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
    target.innerHTML = '<div class="empty-state">ÀÏÀÚº° ¹èÄ¡°¡ ¿©±â¿¡ Ç¥½ÃµË´Ï´Ù.</div>';
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
        <span class="schedule-status ${isHoliday ? "holiday" : "work"}">${isHoliday ? "ÈÞ¹«ÀÏ" : `${entries.length}¸í ¹èÄ¡`}</span>
      </div>
      <div class="worker-chip-row"></div>
    `;

    const row = card.querySelector(".worker-chip-row");
    if (isHoliday) {
      row.innerHTML = '<span class="worker-chip">ÈÞ¹«</span>';
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
    target.innerHTML = '<div class="empty-state">ÀÎ¿øº° Åë°è°¡ ¿©±â¿¡ Ç¥½ÃµË´Ï´Ù.</div>';
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
          <span class="subtle">ÃÑ ${total}È¸ ¹èÄ¡</span>
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
    elements.outputText.textContent = "»ý¼ºµÈ ÅØ½ºÆ® Ãâ·ÂÀÌ ¾ø½À´Ï´Ù.";
    elements.statisticText.textContent = "»ý¼ºµÈ Åë°è ÅØ½ºÆ®°¡ ¾ø½À´Ï´Ù.";
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

function loadSampleData() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1, 12);
  const end = new Date(today.getFullYear(), today.getMonth() + 5, 30, 12);
  elements.startDate.value = toDateKey(start);
  elements.endDate.value = toDateKey(end);
  elements.workersInput.value = "AAA BBB CCC DDD EEE FFF";
  elements.priorityInput.value = "Åä,ÀÏ,¿ù,±Ý,È­,¸ñ,¼ö";
  elements.nthRulesInput.value = "2 ¸ñ\n4 ¸ñ";
  state.customHolidays = [];
  state.customWorkdays = [];
  buildWeeklyHolidayChecks();
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
elements.priorityInput.addEventListener("input", () => {
  updateAutoHolidayPreview();
  generateSchedule();
});
elements.nthRulesInput.addEventListener("input", () => {
  updateAutoHolidayPreview();
  generateSchedule();
});
elements.generateBtn.addEventListener("click", () => generateSchedule());
elements.loadSampleBtn.addEventListener("click", () => loadSampleData());

elements.addHolidayBtn.addEventListener("click", () => {
  if (!elements.holidayDateInput.value) {
    setError("Ä¿½ºÅÒ ÈÞ¹«ÀÏ ³¯Â¥¸¦ ¼±ÅÃÇØÁÖ¼¼¿ä.");
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
    setError("Ä¿½ºÅÒ ±Ù¹«ÀÏ ³¯Â¥¸¦ ¼±ÅÃÇØÁÖ¼¼¿ä.");
    return;
  }
  if (!Number.isInteger(count) || count <= 0) {
    setError("±Ù¹«ÀÚ ¼ö´Â 1 ÀÌ»óÀÇ Á¤¼ö¿©¾ß ÇÕ´Ï´Ù.");
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
  setActiveTab("visual");
  loadSampleData();
})();
