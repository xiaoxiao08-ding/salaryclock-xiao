// 在文件开头添加 DOM 加载完成的事件监听
document.addEventListener('DOMContentLoaded', function() {
    // 确保所有元素都存在
    const requiredElements = [
        'salaryAmount',
        'timeLeftHours',
        'timeLeftMinutes',
        'timeLeftSeconds',
        'compareDateTime',
        'resetDateTime'
    ];
    
    for (const id of requiredElements) {
        if (!document.getElementById(id)) {
            console.error(`Missing element with id: ${id}`);
            return;
        }
    }
    
    // 初始化设置
    initializeSettings();
    
    // 添加事件监听器
    addEventListeners();
    
    // 开始计算
    startCalculation();
    
    // 初始化日期时间选择器
    const now = new Date();
    const compareDateTime = document.getElementById('compareDateTime');
    compareDateTime.value = now.toISOString().slice(0, 16);
    
    // 添加日期选择事件
    compareDateTime.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        if (!isNaN(selectedDate.getTime())) {
            window._customDate = selectedDate;
            updateAll();
        }
    });
    
    // 添加重置按钮事件
    document.getElementById('resetDateTime').addEventListener('click', function() {
        window._customDate = null;
        const now = new Date();
        compareDateTime.value = now.toISOString().slice(0, 16);
        updateAll();
    });
});

// 初始化设置
function initializeSettings() {
    const settings = JSON.parse(localStorage.getItem('salarySettings'));
    if (settings) {
        document.getElementById('monthlySalary').value = settings.monthlySalary;
        document.getElementById('workSchedule').value = settings.workSchedule;
        document.getElementById('workStartTime').value = settings.workStartTime;
        document.getElementById('workEndTime').value = settings.workEndTime;
        document.getElementById('hireDate').value = settings.hireDate;
        
        if (settings.workSchedule === 'custom') {
            document.getElementById('customRestDaysGroup').style.display = 'block';
            document.getElementById('customRestDays').value = settings.customRestDays;
        }
    }
}

// 添加事件监听器
function addEventListeners() {
    // 设置按钮点击事件
    document.getElementById('settingsBtn').addEventListener('click', function() {
        document.getElementById('settingsModal').classList.add('show');
    });
    
    // 关闭按钮点击事件
    document.getElementById('closeModalBtn').addEventListener('click', function() {
        document.getElementById('settingsModal').classList.remove('show');
    });
    
    // 时间段切换按钮点击事件
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateSalaryDisplay();
        });
    });
    
    // 休息制度切换事件
    document.getElementById('workSchedule').addEventListener('change', function() {
        const customGroup = document.getElementById('customRestDaysGroup');
        customGroup.style.display = this.value === 'custom' ? 'block' : 'none';
    });
    
    // 设置表单提交事件
    document.getElementById('settingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const settings = {
            monthlySalary: parseFloat(document.getElementById('monthlySalary').value),
            workSchedule: document.getElementById('workSchedule').value,
            workStartTime: document.getElementById('workStartTime').value,
            workEndTime: document.getElementById('workEndTime').value,
            hireDate: document.getElementById('hireDate').value
        };
        
        if (settings.workSchedule === 'custom') {
            settings.customRestDays = parseInt(document.getElementById('customRestDays').value);
        }
        
        // 验证数据有效性
        if (!settings.monthlySalary || settings.monthlySalary <= 0) {
            alert('请输入有效的月薪金额');
            return;
        }
        
        localStorage.setItem('salarySettings', JSON.stringify(settings));
        document.getElementById('settingsModal').classList.remove('show');
        // 重新开始计算
        startCalculation();
    });
}

// 工资计算相关函数
function calculateSalary(settings, period) {
    if (!settings) return 0;
    
    // 计算日薪
    const dailySalary = calculateDailySalary(settings);
    
    switch(period) {
        case 'day':
            return calculateDaySalary(settings, dailySalary);
        case 'month':
            return calculateMonthSalary(settings, dailySalary);
        case 'year':
            return calculateYearSalary(settings, dailySalary);
        case 'total':
            return calculateTotalSalary(settings, dailySalary);
        default:
            return 0;
    }
}

function calculateDailySalary(settings) {
    if (!settings || !settings.monthlySalary) return 0;
    
    const monthlySalary = parseFloat(settings.monthlySalary);
    if (isNaN(monthlySalary) || monthlySalary <= 0) return 0;
    
    const workDaysCount = calculateMonthWorkDays(settings);
    if (workDaysCount <= 0) return 0;
    
    return monthlySalary / workDaysCount;
}

function calculateDaySalary(settings, dailySalary) {
    const now = getCurrentDate();
    
    // 如果不是工作日，返回0
    if (!utils.isWorkday(now, settings.workSchedule)) {
        return 0;
    }
    
    const start = new Date();
    const [startHour, startMinute] = settings.workStartTime.split(':');
    start.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const end = new Date();
    const [endHour, endMinute] = settings.workEndTime.split(':');
    end.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
    
    if (now < start) {
        return 0;  // 还未上班
    }
    
    if (now > end) {
        return dailySalary;  // 已经下班，返回全天工资
    }
    
    // 计算当前已工作时间的工资（精确到秒）
    const workSeconds = Math.floor((now - start) / 1000);
    const totalSeconds = utils.calculateMinutesBetween(settings.workStartTime, settings.workEndTime) * 60;
    
    return (workSeconds / totalSeconds) * dailySalary;
}

function calculateMonthSalary(settings, dailySalary) {
    const now = getCurrentDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    let totalSalary = 0;
    
    // 计算本月1号到今天的工资
    for (let date = new Date(year, month, 1); date <= now; date.setDate(date.getDate() + 1)) {
        if (utils.isWorkday(date, settings.workSchedule)) {
            if (utils.isSameDay(date, now)) {
                // 如果是今天，按实际工作时间计算
                totalSalary += calculateDaySalary(settings, dailySalary);
            } else {
                // 其他日期按全天计算
                totalSalary += dailySalary;
            }
        }
    }
    
    return totalSalary;
}

function calculateYearSalary(settings, dailySalary) {
    const now = getCurrentDate();
    const startDate = new Date(now.getFullYear(), 0, 1);
    let totalSalary = 0;
    
    // 计算从1月1日到今天的工资
    for (let date = new Date(startDate); date <= now; date.setDate(date.getDate() + 1)) {
        if (utils.isWorkday(date, settings.workSchedule)) {
            if (utils.isSameDay(date, now)) {
                // 如果是今天，按实际工作时间计算
                totalSalary += calculateDaySalary(settings, dailySalary);
            } else {
                // 其他日期按全天计算
                totalSalary += dailySalary;
            }
        }
    }
    
    return totalSalary;
}

function calculateTotalSalary(settings, dailySalary) {
    const now = getCurrentDate();
    const hireDate = new Date(settings.hireDate);
    let totalSalary = 0;
    
    for (let date = new Date(hireDate); date <= now; date.setDate(date.getDate() + 1)) {
        if (utils.isWorkday(date, settings.workSchedule)) {
            if (utils.isSameDay(date, now)) {
                // 今天按实际工作时间计算
                totalSalary += calculateDaySalary(settings, dailySalary);
            } else {
                // 已过去的工作日按全天计算
                totalSalary += dailySalary;
            }
        }
    }
    
    return totalSalary;
}

// 计算当月工作日数
function calculateMonthWorkDays(settings) {
    const now = getCurrentDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    let adjustWorkDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayOfWeek = date.getDay();
        
        // 1. 计算周末天数
        if (settings.workSchedule === '5' && (dayOfWeek === 0 || dayOfWeek === 6)) {
            weekendDays++;
        } else if (settings.workSchedule === '6' && dayOfWeek === 0) {
            weekendDays++;
        }
        
        // 2. 检查节假日和调休
        if (window.HOLIDAYS && window.HOLIDAYS[year] && window.HOLIDAYS[year][dateStr]) {
            const dayType = window.HOLIDAYS[year][dateStr];
            if (dayType === 1) {  // 法定节假日
                // 只统计非周末的节假日
                if (settings.workSchedule === '5' && dayOfWeek !== 0 && dayOfWeek !== 6) {
                    holidayDays++;
                } else if (settings.workSchedule === '6' && dayOfWeek !== 0) {
                    holidayDays++;
                }
            } else if (dayType === 2) {  // 调休工作日
                adjustWorkDays++;
            }
        }
    }
    
    // 计算实际工作日
    workDays = daysInMonth - weekendDays - holidayDays + adjustWorkDays;
    return workDays;
}

// 更新显示相关函数
function startCalculation() {
    // 立即执行一次
    updateAll();
    
    // 设置定时器
    setInterval(() => {
        updateAll();
    }, 1000);
}

function updateAll() {
    updateSalaryDisplay();
    updateCurrentTime();
    const settings = JSON.parse(localStorage.getItem('salarySettings'));
    if (settings) {
        calculateTimeLeft(settings);
    }
}

function updateSalaryDisplay() {
    const settings = JSON.parse(localStorage.getItem('salarySettings'));
    if (!settings) return;
    
    const activePeriod = document.querySelector('.period-btn.active').dataset.period;
    const salary = calculateSalary(settings, activePeriod);
    
    const amountElement = document.getElementById('salaryAmount');
    if (!amountElement) return;
    amountElement.textContent = utils.formatMoney(salary);
    amountElement.classList.remove('updating');
    void amountElement.offsetWidth;
    amountElement.classList.add('updating');
}

function calculateTimeLeft(settings) {
    const now = getCurrentDate();
    
    // 检查是否是工作日
    if (!utils.isWorkday(now, settings.workSchedule)) {
        updateTimeDisplay('休假回血中');
        return;
    }
    
    const start = new Date(now);
    const [startHour, startMinute] = settings.workStartTime.split(':');
    start.setHours(parseInt(startHour), parseInt(startMinute), 0);
    
    // 检查是否在工作时间之前
    if (now < start) {
        updateTimeDisplay('未上班');
        return;
    }
    
    const end = new Date(now);
    const [endHour, endMinute] = settings.workEndTime.split(':');
    end.setHours(parseInt(endHour), parseInt(endMinute), 0);
    
    // 检查是否已经下班
    if (now > end) {
        updateTimeDisplay('下班啦~');
        return;
    }
    
    // 计算剩余时间
    const timeLeft = end - now;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    updateTimeDisplay(
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    );
    
    // 更新紧急状态
    const countdown = document.querySelector('.countdown');
    if (hours === 0 && minutes < 30) {
        countdown.classList.add('urgent');
    } else {
        countdown.classList.remove('urgent');
    }
}

function updateTimeDisplay(hours, minutes, seconds) {
    if (arguments.length === 1) {
        // 如果只传入一个参数，显示相同的文本在所有位置
        const text = hours.toString();
        const timeColumns = document.querySelectorAll('.time-column');
        const timeUnits = document.querySelectorAll('.time-unit');
        
        // 隐藏所有时间单位（时分秒）
        timeUnits.forEach(unit => {
            unit.style.display = 'none';
        });
        
        // 只在第一个时间列显示文本，隐藏其他列
        timeColumns.forEach((column, index) => {
            if (index === 0) {
                column.style.display = 'block';
                column.querySelector('.time-value span:first-child').textContent = text;
            } else {
                column.style.display = 'none';
            }
        });
        return;
    }
    
    // 显示所有时间列和单位
    const timeColumns = document.querySelectorAll('.time-column');
    const timeUnits = document.querySelectorAll('.time-unit');
    
    timeColumns.forEach(column => {
        column.style.display = 'block';
    });
    
    timeUnits.forEach(unit => {
        unit.style.display = 'block';
    });
    
    document.getElementById('timeLeftHours').textContent = hours;
    document.getElementById('timeLeftMinutes').textContent = minutes;
    document.getElementById('timeLeftSeconds').textContent = seconds;
}

// 更新当前时间显示
function updateCurrentTime() {
    const now = getCurrentDate();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    const dateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

// 修改获取当前时间的方法
function getCurrentDate() {
    return window._customDate || new Date();
}