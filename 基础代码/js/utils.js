// 工具函数
const utils = {
    // 格式化金额
    formatMoney: (amount) => {
        return amount.toFixed(2);
    },

    // 格式化工作时长
    formatWorkTime: (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}小时${mins}分钟`;
    },

    // 更新工作日判断逻辑
    isWorkday: (date, workSchedule) => {
        // 格式化日期为 'YYYY-MM-DD' 格式
        const dateStr = date.toISOString().split('T')[0];
        const year = date.getFullYear();
        const dayOfWeek = date.getDay();
        
        // 1. 先检查是否是法定节假日（优先级最高）
        if (window.HOLIDAYS && window.HOLIDAYS[year] && window.HOLIDAYS[year][dateStr]) {
            const dayType = window.HOLIDAYS[year][dateStr];
            if (dayType === 1) {
                return false;  // 法定节假日一定不是工作日
            } else if (dayType === 2) {
                return true;   // 调休日一定是工作日
            }
        }
        
        // 2. 如果不是节假日，按照工作制度判断是否是工作日
        // 标准工作制（双休或单休）
        const restDays = parseInt(workSchedule);
        if (restDays === 5) {
            return dayOfWeek !== 0 && dayOfWeek !== 6; // 双休
        } else if (restDays === 6) {
            return dayOfWeek !== 0; // 单休
        }
        
        return true;  // 其他情况默认为工作日
    },

    // 计算两个时间点之间的分钟数
    calculateMinutesBetween: (time1, time2) => {
        const [hour1, minute1] = time1.split(':');
        const [hour2, minute2] = time2.split(':');
        return (parseInt(hour2) - parseInt(hour1)) * 60 + (parseInt(minute2) - parseInt(minute1));
    },

    // 判断两个日期是否是同一天
    isSameDay: (date1, date2) => {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
};