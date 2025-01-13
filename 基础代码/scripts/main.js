// 配置管理
const Config = {
    STORAGE_KEYS: {
        MONTHLY_SALARY: 'monthly_salary',
        WORK_SCHEDULE: 'work_schedule',
        CUSTOM_WORK_DAYS: 'custom_work_days',
        WORK_START: 'work_start',
        WORK_END: 'work_end',
        START_DATE: 'start_date'
    },

    save(key, value) {
        localStorage.setItem(key, value);
    },

    get(key) {
        return localStorage.getItem(key);
    },

    loadSavedConfig() {
        const keys = Object.values(this.STORAGE_KEYS);
        keys.forEach(key => {
            const value = this.get(key);
            if (value) {
                const element = document.getElementById(key.replace(/_/g, '-'));
                if (element) element.value = value;
            }
        });
        
        // 检查并显示/隐藏自定义休息天数输入框
        const workSchedule = this.get(this.STORAGE_KEYS.WORK_SCHEDULE);
        if (workSchedule === 'custom') {
            document.getElementById('custom-days-container').style.display = 'block';
        }
    }
};

// 工资计算器
const SalaryCalculator = {
    getMonthlyWorkDays() {
        const schedule = document.getElementById('work-schedule').value;
        if (schedule === 'custom') {
            const customDays = parseInt(document.getElementById('custom-work-days').value) || 8;
            return 30 - customDays;
        }
        return 30 - (parseInt(schedule) * 4); // 5=双休=8天, 6=单休=4天
    },

    getDailySalary() {
        const monthlySalary = parseFloat(document.getElementById('monthly-salary').value) || 0;
        const workDays = this.getMonthlyWorkDays();
        return workDays ? monthlySalary / workDays : 0;
    },

    getCurrentDayProgress() {
        const now = new Date();
        const startTime = this.parseTimeString(document.getElementById('work-start').value);
        const endTime = this.parseTimeString(document.getElementById('work-end').value);
        
        if (!this.isWorkday() || !startTime || !endTime) return 0;

        const currentTime = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const workStart = startTime.hours * 3600 + startTime.minutes * 60;
        const workEnd = endTime.hours * 3600 + endTime.minutes * 60;

        if (currentTime < workStart) return 0;
        if (currentTime > workEnd) return 1;
        return (currentTime - workStart) / (workEnd - workStart);
    },

    parseTimeString(timeStr) {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return { hours, minutes };
    },

    isWorkday() {
        const now = new Date();
        const day = now.getDay();
        const schedule = document.getElementById('work-schedule').value;
        
        if (schedule === 'custom') return true; // 自定义模式下简化处理
        if (schedule === '5') return day !== 0 && day !== 6;
        if (schedule === '6') return day !== 0;
        return true;
    },

    getWorkdaysInCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workdays = 0;

        for (let day = 1; day <= now.getDate(); day++) {
            const date = new Date(year, month, day);
            if (this.isWorkday(date)) {
                workdays++;
            }
        }
        return workdays;
    },

    calculateEarnings(range) {
        const dailySalary = this.getDailySalary();
        const now = new Date();
        
        switch (range) {
            case 'day':
                return dailySalary * this.getCurrentDayProgress();
            case 'month': {
                const dayOfMonth = now.getDate();
                const workdays = this.getWorkdaysInCurrentMonth();
                return dailySalary * workdays;
            }
            case 'year': {
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const workdays = this.getWorkdaysInCurrentMonth(); // 简化版本，实际应该计算整年
                return dailySalary * workdays * (now.getMonth() + 1);
            }
            case 'total': {
                const startDate = document.getElementById('start-date').value;
                if (!startDate) return 0;
                
                const start = new Date(startDate);
                const months = (now.getFullYear() - start.getFullYear()) * 12 
                             + now.getMonth() - start.getMonth();
                return dailySalary * this.getWorkdaysInCurrentMonth() * months;
            }
            default:
                return 0;
        }
    }
};

// UI 管理器
const UIManager = {
    updateEarningsDisplay(amount) {
        document.getElementById('current-earnings').textContent = 
            amount.toFixed(2);
    },

    updateCountdown() {
        const now = new Date();
        const endTime = SalaryCalculator.parseTimeString(document.getElementById('work-end').value);
        
        if (!endTime || !SalaryCalculator.isWorkday()) {
            document.getElementById('countdown-text').textContent = 
                SalaryCalculator.isWorkday() ? '已下班' : '休息日';
            return;
        }

        const endDate = new Date(now.setHours(endTime.hours, endTime.minutes, 0));
        const diff = endDate - now;

        if (diff <= 0) {
            document.getElementById('countdown-text').textContent = '已下班';
            return;
        }

        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        document.getElementById('countdown-text').textContent = 
            `距离下班还有 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
};

// 模态框管理器
const ModalManager = {
    init() {
        const modal = document.getElementById('settings-modal');
        const openBtn = document.getElementById('open-settings');
        const closeBtn = document.querySelector('.close-modal');
        const saveBtn = document.getElementById('save-settings');
        const workScheduleSelect = document.getElementById('work-schedule');
        const customDaysContainer = document.getElementById('custom-days-container');

        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        saveBtn.addEventListener('click', () => {
            this.saveSettings();
            modal.classList.remove('active');
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });

        // 处理自定义工作制度
        workScheduleSelect.addEventListener('change', (e) => {
            customDaysContainer.style.display = 
                e.target.value === 'custom' ? 'block' : 'none';
        });
    },

    saveSettings() {
        const inputs = document.querySelectorAll('.modal-body input, .modal-body select');
        inputs.forEach(input => {
            const key = input.id.replace(/-/g, '_');
            Config.save(Config.STORAGE_KEYS[key.toUpperCase()], input.value);
        });

        // 刷新显示
        const activeRange = document.querySelector('.time-range-buttons button.active').dataset.range;
        const earnings = SalaryCalculator.calculateEarnings(activeRange);
        UIManager.updateEarningsDisplay(earnings);
    }
};

// 初始化应用
function initApp() {
    Config.loadSavedConfig();
    ModalManager.init();

    // 设置时间范围按钮事件
    document.querySelectorAll('.time-range-buttons button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.time-range-buttons button').forEach(btn => 
                btn.classList.remove('active'));
            e.target.classList.add('active');
            
            const range = e.target.dataset.range;
            const earnings = SalaryCalculator.calculateEarnings(range);
            UIManager.updateEarningsDisplay(earnings);
        });
    });
    
    // 启动定时更新
    setInterval(() => {
        const activeRange = document.querySelector('.time-range-buttons button.active').dataset.range;
        const earnings = SalaryCalculator.calculateEarnings(activeRange);
        UIManager.updateEarningsDisplay(earnings);
        UIManager.updateCountdown();
    }, 1000);
}

// 启动应用
document.addEventListener('DOMContentLoaded', initApp); 